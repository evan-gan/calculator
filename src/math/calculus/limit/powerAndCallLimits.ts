import { isCalculusOperator } from '../../ast/calculus';
import { containsVariable } from '../../ast/inspect';
import { divide, E, fraction, func, mul, num, PI, pow, type Expr, type FunctionNode } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate, numericSign } from '../../evaluate/evaluate';
import { powerOf, productOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { deeper, isZeroLimit } from './indeterminate';
import { signNear } from './probe';
import { BOUNDED, UNKNOWN, finite, infinite, type FindLimit, type LimitContext, type LimitResult } from './types';

// Limits of powers u^v and function calls f(u), from the limit of their parts.

/** An exact value computed from limits, or UNKNOWN when it is undefined (0⁻¹, ln of a negative). */
function exactly(compute: () => Expr): LimitResult {
  try {
    const value = compute();
    return Number.isNaN(evaluate(value)) && !containsVariable(value) ? UNKNOWN : finite(value);
  } catch (error) {
    if (error instanceof MathError) return UNKNOWN;
    throw error;
  }
}

const isInteger = (expr: Expr) => expr.type === 'num' && expr.value.isInteger();
const isEvenInteger = (expr: Expr) => expr.type === 'num' && expr.value.isInteger() && expr.value.numerator % 2n === 0n;

/** u^c with a constant exponent c, given lim u. */
function powerWithConstantExponent(base: Expr, baseLimit: LimitResult, exponent: Expr, context: LimitContext): LimitResult {
  const exponentSign = numericSign(exponent);
  if (exponentSign === null) return UNKNOWN;
  switch (baseLimit.kind) {
    case 'finite': {
      if (!isZeroLimit(baseLimit)) return exactly(() => powerOf(baseLimit.value, exponent));
      // u → 0: u^c → 0 for c > 0, and ±∞ for c < 0 with the sign of u^c next to the point.
      const baseSign = isEvenInteger(exponent) ? 1 : signNear(base, context);
      if (baseSign === null || (baseSign === -1 && !isInteger(exponent))) return UNKNOWN;
      return exponentSign > 0 ? finite(num(0)) : infinite(baseSign);
    }
    case 'infinite': {
      if (exponentSign < 0) return finite(num(0));
      if (baseLimit.sign === 1) return infinite(1);
      if (!isInteger(exponent)) return UNKNOWN;
      return infinite(isEvenInteger(exponent) ? 1 : -1);
    }
    case 'bounded':
      return exponentSign > 0 && isInteger(exponent) ? BOUNDED : UNKNOWN;
    default:
      return UNKNOWN;
  }
}

/** c^v with a constant base c, given lim v. */
function constantBaseToPower(base: Expr, exponentLimit: LimitResult): LimitResult {
  const baseValue = evaluate(base);
  switch (exponentLimit.kind) {
    case 'finite':
      return exactly(() => powerOf(base, exponentLimit.value));
    case 'infinite': {
      if (baseValue === 1) return finite(num(1));
      if (!(baseValue > 0)) return UNKNOWN;
      // c^∞ = ∞ for c > 1 and 0 for 0 < c < 1; c^-∞ the other way round.
      const grows = (baseValue > 1) === (exponentLimit.sign === 1);
      return grows ? infinite(1) : finite(num(0));
    }
    case 'bounded':
      return baseValue > 0 ? BOUNDED : UNKNOWN;
    default:
      return UNKNOWN;
  }
}

/** lim u^v: a constant on one side, otherwise e^(lim v·ln u) (1^∞, 0⁰ and ∞⁰ forms). */
export function limitOfPower(base: Expr, exponent: Expr, context: LimitContext, findLimit: FindLimit): LimitResult {
  const variable = context.approach.variable;
  if (!containsVariable(exponent, variable)) return powerWithConstantExponent(base, findLimit(base, context), exponent, context);
  if (!containsVariable(base, variable)) return constantBaseToPower(base, findLimit(exponent, context));
  const next = deeper(context);
  if (!next) return UNKNOWN;
  const logLimit = findLimit(simplify(mul(exponent, func('ln', base))), next);
  if (logLimit.kind === 'finite') return exactly(() => powerOf(E, logLimit.value));
  if (logLimit.kind === 'infinite') return logLimit.sign === 1 ? infinite(1) : finite(num(0));
  return logLimit.kind === 'bounded' ? BOUNDED : UNKNOWN;
}

/** tan u = sin u/cos u and so on, so poles become ordinary quotients. */
function asSinesAndCosines(call: FunctionNode): Expr | null {
  const [u] = call.args;
  const [sine, cosine] = [func('sin', u), func('cos', u)];
  switch (call.name) {
    case 'tan':
      return divide(sine, cosine);
    case 'cot':
      return divide(cosine, sine);
    case 'sec':
      return pow(cosine, num(-1));
    case 'csc':
      return pow(sine, num(-1));
    default:
      return null;
  }
}

/** f(u) where u tends to a finite value a: f(a) by continuity, or the behaviour at a pole. */
function callAtFiniteArgument(call: FunctionNode, argumentLimit: Expr, context: LimitContext, findLimit: FindLimit): LimitResult {
  const continuous = exactly(() => simplify(func(call.name, argumentLimit)));
  if (continuous.kind === 'finite') return continuous;
  if (call.name === 'ln' && isZeroLimit(finite(argumentLimit))) {
    return signNear(call.args[0], context) === 1 ? infinite(-1) : UNKNOWN;
  }
  const rewritten = asSinesAndCosines(call);
  const next = deeper(context);
  return rewritten && next ? findLimit(simplify(rewritten), next) : UNKNOWN;
}

function callAtInfiniteArgument(name: string, sign: 1 | -1): LimitResult {
  switch (name) {
    case 'ln':
      return sign === 1 ? infinite(1) : UNKNOWN;
    case 'arctan':
      return finite(productOf(num(sign), fraction(1, 2), PI));
    case 'sin':
    case 'cos':
      return BOUNDED;
    case 'abs':
      return infinite(1);
    case 'factorial':
      return sign === 1 ? infinite(1) : UNKNOWN;
    default:
      return UNKNOWN;
  }
}

/** lim f(u) from lim u. */
export function limitOfCall(call: FunctionNode, context: LimitContext, findLimit: FindLimit): LimitResult {
  if (isCalculusOperator(call.name)) return UNKNOWN;
  if (call.name === 'log') {
    // log_b u = ln u / ln b
    const [argument, base] = call.args;
    if (containsVariable(base, context.approach.variable)) return UNKNOWN;
    return findLimit(simplify(divide(func('ln', argument), func('ln', base))), context);
  }
  const argumentLimit = findLimit(call.args[0], context);
  switch (argumentLimit.kind) {
    case 'finite':
      return callAtFiniteArgument(call, argumentLimit.value, context, findLimit);
    case 'infinite':
      return callAtInfiniteArgument(call.name, argumentLimit.sign);
    case 'bounded':
      return ['sin', 'cos', 'arctan', 'abs'].includes(call.name) ? BOUNDED : UNKNOWN;
    default:
      return UNKNOWN;
  }
}
