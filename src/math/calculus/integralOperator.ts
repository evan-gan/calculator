import { infinityDirection, integral, readIntegral } from '../ast/calculus';
import { collectVariables, containsVariable, substituteVariable, toKey } from '../ast/inspect';
import { num, type Expr, type FunctionNode } from '../ast/nodes';
import { MathError } from '../errors';
import { evaluate } from '../evaluate/evaluate';
import { differenceOf } from '../operations/arithmetic';
import { simplify } from '../simplify/simplify';
import { findAntiderivative } from './integrate/antiderivative';
import { limitAtInfinity, limitAtPoint } from './antiderivativeLimits';
import { numericIntegral } from './numericIntegral';
import { findSingularPoints } from './singularPoints';

// ∫ f dx and ∫_a^b f dx. A definite integral with numeric limits is always also computed
// numerically: that catches divergent integrals (∫_{-1}^{1} dx/x² is not -2) and confirms the
// exact answer. Without an exact answer the integral stays unevaluated and displays as ≈ value.

/**
 * Value of F at a limit of integration (a number, an expression, or ±∞), approached from
 * inside the interval (`side` = +1 from above); null if it has no exact value.
 */
function valueAtLimit(antiderivative: Expr, variable: string, limit: Expr, side: 1 | -1): Expr | null {
  const direction = infinityDirection(limit);
  if (direction !== 0) return limitAtInfinity(antiderivative, variable, direction);
  if (containsVariable(limit)) return simplify(substituteVariable(antiderivative, variable, limit));
  return limitAtPoint(antiderivative, variable, limit, side);
}

function exactDefiniteIntegral(integrand: Expr, variable: string, lower: Expr, upper: Expr): Expr | null {
  const antiderivative = findAntiderivative(integrand, variable);
  if (!antiderivative) return null;
  // "Inside" is above the lower limit, unless the limits are written in decreasing order.
  const isReversed = evaluate(lower) > evaluate(upper);
  const atUpper = valueAtLimit(antiderivative, variable, upper, isReversed ? 1 : -1);
  const atLower = valueAtLimit(antiderivative, variable, lower, isReversed ? -1 : 1);
  return atUpper && atLower ? differenceOf(atUpper, atLower) : null;
}

/** ∫_a^b f dx as a float, or null if it diverges. Only for integrands without other variables. */
export function numericDefiniteIntegral(integrand: Expr, variable: string, lower: Expr, upper: Expr): number | null {
  const start = evaluate(lower);
  const end = evaluate(upper);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const breakpoints = findSingularPoints(integrand, variable, start, end);
  return numericIntegral((x) => evaluate(integrand, { [variable]: x }), start, end, breakpoints);
}

function agrees(exactValue: number, numericValue: number): boolean {
  return Math.abs(exactValue - numericValue) <= 1e-6 * Math.max(1, Math.abs(numericValue));
}

function simplifyDefiniteIntegral(integrand: Expr, variable: string, lower: Expr, upper: Expr): Expr {
  if (toKey(lower) === toKey(upper)) return num(0);
  const exact = exactDefiniteIntegral(integrand, variable, lower, upper);
  const canCheck = !containsVariable(lower) && !containsVariable(upper) && collectVariables(integrand).every((name) => name === variable);
  if (!canCheck) return exact ?? integral(integrand, variable, { lower, upper });
  const numericValue = numericDefiniteIntegral(integrand, variable, lower, upper);
  if (numericValue === null) {
    throw new MathError(
      'This integral has no value that could be computed: it diverges, is undefined between its limits, or oscillates too much.',
    );
  }
  if (exact && agrees(evaluate(exact), numericValue)) return exact;
  return integral(integrand, variable, { lower, upper });
}

/** Simplify an integral node: an antiderivative, an exact value, or the unevaluated integral. */
export function simplifyIntegral(call: FunctionNode): Expr {
  const { body, variable, bounds } = readIntegral(call);
  const integrand = simplify(body);
  if (bounds) return simplifyDefiniteIntegral(integrand, variable, simplify(bounds.lower), simplify(bounds.upper));
  const antiderivative = findAntiderivative(integrand, variable);
  if (!antiderivative) {
    throw new MathError("Couldn't find an exact antiderivative for this integral. Add limits to get a numeric value.");
  }
  return antiderivative;
}
