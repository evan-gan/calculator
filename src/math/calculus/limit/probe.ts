import { substituteVariable } from '../../ast/inspect';
import { containsCalculusOperator } from '../../ast/calculus';
import type { Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate } from '../../evaluate/evaluate';
import { simplify } from '../../simplify/simplify';
import { pointAtDistance } from './numericLimit';
import type { Approach, LimitContext } from './types';

// Numeric looks at an expression close to the point, used to settle signs (1/x → +∞ or -∞)
// and to make sure an expression is defined on the side being approached.

/** The point as a float: a number, or ±Infinity for a limit at ±∞. */
export function pointValue(approach: Approach): number {
  return approach.point ? evaluate(approach.point) : approach.direction * Infinity;
}

/** Value of the expression at `distance` from the point on the approached side (NaN if it can't be probed). */
export function valueNear(expr: Expr, context: LimitContext, distance: number): number {
  if (!context.canProbe) return NaN;
  const { approach } = context;
  const x = pointAtDistance(pointValue(approach), approach.direction, distance);
  return evaluate(expr, { [approach.variable]: x });
}

/** The sign the expression keeps just next to the point, or null if it changes or can't be told. */
export function signNear(expr: Expr, context: LimitContext): 1 | -1 | null {
  const signs = [1e-4, 1e-6, 1e-8].map((distance) => Math.sign(valueNear(expr, context, distance)));
  if (signs.some((sign) => sign !== signs[0]) || !(signs[0] === 1 || signs[0] === -1)) return null;
  return signs[0];
}

/**
 * f(a) by plain substitution, when that is the limit: f is defined at the point and on the
 * side approached (√x at 0 from the left is not). Null otherwise.
 */
export function substitutedValue(expr: Expr, context: LimitContext): Expr | null {
  const { approach } = context;
  if (!approach.point) return null;
  let value: Expr;
  try {
    value = simplify(substituteVariable(expr, approach.variable, approach.point));
  } catch (error) {
    // 0/0, ln 0 and the like: substitution doesn't decide this limit.
    if (error instanceof MathError) return null;
    throw error;
  }
  if (containsCalculusOperator(value)) return null;
  if (context.canProbe && (!Number.isFinite(evaluate(value)) || Number.isNaN(valueNear(expr, context, 1e-7)))) return null;
  return value;
}
