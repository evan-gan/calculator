import { containsVariable } from '../../ast/inspect';
import {
  add,
  divide,
  fraction,
  func,
  mul,
  num,
  pow,
  sqrt,
  subtract,
  variable as variableNode,
  type ElementaryFunctionName,
  type Expr,
  type FunctionNode,
  type PowerNode,
} from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { negated, productOf, quotientOf, squareRootOf } from '../../operations/arithmetic';
import { toPolynomial } from '../../solve/polynomial/extract';
import { linearParts } from './linear';
import { integrateReciprocalQuadratic } from './quadratic';
import type { IntegrationMethod } from './types';

// Table of standard integrals. Each entry is written for a linear argument u = ax + b,
// so ∫ f(u) dx = F(u)/a: ∫ cos(3x) dx = sin(3x)/3.

const lnAbs = (inner: Expr) => func('ln', func('abs', inner));

/** Antiderivative F(u) of each function with respect to its own argument u. */
const FUNCTION_ANTIDERIVATIVES: Partial<Record<ElementaryFunctionName, (u: Expr) => Expr>> = {
  sin: (u) => mul(num(-1), func('cos', u)),
  cos: (u) => func('sin', u),
  tan: (u) => mul(num(-1), lnAbs(func('cos', u))),
  sec: (u) => lnAbs(add(func('sec', u), func('tan', u))),
  csc: (u) => mul(num(-1), lnAbs(add(func('csc', u), func('cot', u)))),
  cot: (u) => lnAbs(func('sin', u)),
  ln: (u) => subtract(mul(u, func('ln', u)), u),
  arcsin: (u) => add(mul(u, func('arcsin', u)), sqrt(subtract(num(1), pow(u, num(2))))),
  arccos: (u) => subtract(mul(u, func('arccos', u)), sqrt(subtract(num(1), pow(u, num(2))))),
  arctan: (u) => subtract(mul(u, func('arctan', u)), mul(fraction(1, 2), func('ln', add(num(1), pow(u, num(2)))))),
  abs: (u) => mul(fraction(1, 2), u, func('abs', u)),
};

/** Antiderivatives of f(u)² that are easier than the general power rule (power-reduction identities). */
const SQUARED_ANTIDERIVATIVES: Partial<Record<ElementaryFunctionName, (u: Expr) => Expr>> = {
  sin: (u) => subtract(divide(u, num(2)), divide(func('sin', mul(num(2), u)), num(4))),
  cos: (u) => add(divide(u, num(2)), divide(func('sin', mul(num(2), u)), num(4))),
  tan: (u) => subtract(func('tan', u), u),
  sec: (u) => func('tan', u),
  csc: (u) => mul(num(-1), func('cot', u)),
  cot: (u) => mul(num(-1), add(func('cot', u), u)),
};

function integrateFunction(call: FunctionNode, variable: string): Expr | null {
  const antiderivative = FUNCTION_ANTIDERIVATIVES[call.name as ElementaryFunctionName];
  if (!antiderivative) return null;
  const [argument, base] = call.args;
  if (base && containsVariable(base, variable)) return null;
  const linear = linearParts(argument, variable);
  if (!linear) return null;
  // log_b(u) = ln(u)/ln(b)
  const scale = call.name === 'log' ? productOf(linear.slope, func('ln', base)) : linear.slope;
  return quotientOf(antiderivative(argument), scale);
}

/** u^n with a linear base: u^(n+1)/((n+1)a), or ln|u|/a when n = -1. */
function integrateLinearPower(base: Expr, exponent: Expr, slope: Expr): Expr {
  if (exponent.type === 'num' && exponent.value.equals(num(-1).value)) return quotientOf(lnAbs(base), slope);
  const raised = add(exponent, num(1));
  return divide(pow(base, raised), mul(raised, slope));
}

/** (px² + s)^(-1/2): arcsin when p < 0 < s, ln|√p·x + √(px² + s)| when p > 0. */
function integrateInverseSquareRoot(base: Expr, variable: string): Expr | null {
  const coefficients = toPolynomial(base, variable);
  if (!coefficients || coefficients.length !== 3 || !(coefficients[1].type === 'num' && coefficients[1].value.isZero())) return null;
  const [s, , p] = coefficients;
  const x = variableNode(variable);
  if (numericSign(p) === -1 && numericSign(s) === 1) {
    const scale = squareRootOf(negated(p));
    return quotientOf(func('arcsin', mul(x, sqrt(divide(negated(p), s)))), scale);
  }
  if (numericSign(p) === 1 && numericSign(s) !== null) {
    const scale = squareRootOf(p);
    return quotientOf(lnAbs(add(mul(scale, x), sqrt(base))), scale);
  }
  return null;
}

function integrateReciprocal(base: Expr, variable: string): Expr | null {
  const coefficients = toPolynomial(base, variable);
  if (!coefficients || coefficients.length !== 3 || coefficients.some((coefficient) => containsVariable(coefficient))) return null;
  const [s, q, p] = coefficients;
  return integrateReciprocalQuadratic({ p, q, s }, variable);
}

function integratePower(power: PowerNode, variable: string): Expr | null {
  const { base, exponent } = power;
  if (!containsVariable(base, variable)) {
    // b^(ax + c) = b^(ax + c) / (a ln b)
    const linear = linearParts(exponent, variable);
    return linear ? quotientOf(power, productOf(linear.slope, func('ln', base))) : null;
  }
  if (containsVariable(exponent, variable)) return null;
  const linear = linearParts(base, variable);
  if (linear) return integrateLinearPower(base, exponent, linear.slope);
  const isSquare = exponent.type === 'num' && exponent.value.equals(num(2).value);
  if (isSquare && base.type === 'func') {
    const squared = SQUARED_ANTIDERIVATIVES[base.name as ElementaryFunctionName];
    const inner = linearParts(base.args[0], variable);
    if (squared && inner) return quotientOf(squared(base.args[0]), inner.slope);
  }
  if (exponent.type === 'num' && exponent.value.equals(fraction(-1, 2).value)) return integrateInverseSquareRoot(base, variable);
  if (exponent.type === 'num' && exponent.value.equals(num(-1).value)) return integrateReciprocal(base, variable);
  return null;
}

export const tableMethod: IntegrationMethod = (expr, variable) => {
  switch (expr.type) {
    case 'var':
      return divide(pow(expr, num(2)), num(2));
    case 'pow':
      return integratePower(expr, variable);
    case 'func':
      return integrateFunction(expr, variable);
    default:
      return null;
  }
};
