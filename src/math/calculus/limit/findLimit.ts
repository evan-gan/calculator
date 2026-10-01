import { containsVariable } from '../../ast/inspect';
import { num, type Expr, type SumNode } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { productOf, sumOf } from '../../operations/arithmetic';
import { limitFromGrowth } from './growth';
import { isZeroLimit, resolveSum, resolveZeroTimesInfinity } from './indeterminate';
import { limitOfCall, limitOfPower } from './powerAndCallLimits';
import { substitutedValue } from './probe';
import { rationalFunctionLimit } from './rationalLimit';
import { BOUNDED, UNKNOWN, finite, infinite, type LimitContext, type LimitResult } from './types';

// The limit of an expression, worked out from the limits of its parts: plain substitution when
// that is allowed, exact rational functions, leading terms of algebraic expressions at ±∞, then
// sums, products, powers and function calls, with the indeterminate forms (0·∞, ∞ - ∞, 1^∞)
// handed to indeterminate.ts.

/** Add up the limits of the terms; UNKNOWN for ∞ - ∞ or an unknown term. */
function addLimits(results: LimitResult[]): LimitResult {
  if (results.some((result) => result.kind === 'unknown')) return UNKNOWN;
  const infinitySigns = new Set(results.flatMap((result) => (result.kind === 'infinite' ? [result.sign] : [])));
  if (infinitySigns.size > 1) return UNKNOWN;
  if (infinitySigns.size === 1) return infinite([...infinitySigns][0]);
  if (results.some((result) => result.kind === 'bounded')) return BOUNDED;
  return finite(sumOf(...results.map((result) => (result as { value: Expr }).value)));
}

function limitOfSum(sum: SumNode, context: LimitContext): LimitResult {
  const results = sum.terms.map((term) => findLimit(term, context));
  const combined = addLimits(results);
  return combined.kind === 'unknown' ? resolveSum(sum, results, context, findLimit) : combined;
}

/** Multiply the limits of the factors; 0·∞ goes to L'Hôpital, a bounded factor times 0 is 0. */
function limitOfProduct(factors: Expr[], context: LimitContext): LimitResult {
  const results = factors.map((factor) => findLimit(factor, context));
  if (results.some((result) => result.kind === 'unknown')) return UNKNOWN;
  const hasZero = results.some(isZeroLimit);
  const infinities = results.flatMap((result) => (result.kind === 'infinite' ? [result.sign] : []));
  const hasBounded = results.some((result) => result.kind === 'bounded');
  if (hasZero && infinities.length > 0) return resolveZeroTimesInfinity(factors, results, context, findLimit);
  if (hasZero) return finite(num(0));
  if (hasBounded) return infinities.length > 0 ? UNKNOWN : BOUNDED;
  const finiteProduct = productOf(...results.flatMap((result) => (result.kind === 'finite' ? [result.value] : [])));
  if (infinities.length === 0) return finite(finiteProduct);
  const finiteSign = numericSign(finiteProduct);
  if (finiteSign !== 1 && finiteSign !== -1) return UNKNOWN;
  const sign = infinities.reduce((product: number, infinitySign) => product * infinitySign, finiteSign);
  return infinite(sign as 1 | -1);
}

/** One-sided limit of a simplified expression; see LimitResult for what comes back. */
export function findLimit(expr: Expr, context: LimitContext): LimitResult {
  if (--context.budget.remaining < 0) return UNKNOWN;
  const { approach } = context;
  if (!containsVariable(expr, approach.variable)) return finite(expr);
  const substituted = substitutedValue(expr, context);
  if (substituted) return finite(substituted);
  const rational = rationalFunctionLimit(expr, approach);
  if (rational) return rational;
  const algebraic = approach.point ? null : limitFromGrowth(expr, approach.variable, approach.direction);
  if (algebraic) return algebraic;
  switch (expr.type) {
    case 'var':
      return approach.point ? finite(approach.point) : infinite(approach.direction);
    case 'add':
      return limitOfSum(expr, context);
    case 'mul':
      return limitOfProduct(expr.factors, context);
    case 'pow':
      return limitOfPower(expr.base, expr.exponent, context, findLimit);
    case 'func':
      return limitOfCall(expr, context, findLimit);
    default:
      return UNKNOWN;
  }
}
