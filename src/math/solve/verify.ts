import type { Expr } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';

// Every candidate is substituted back into the ORIGINAL equation, which removes
// extraneous roots from squaring and points where a denominator is zero.

const EXACT_TOLERANCE = 1e-8;
const APPROXIMATE_TOLERANCE = 1e-6;

/** True if x makes left = right (within float tolerance) with both sides defined. */
export function satisfiesEquation(left: Expr, right: Expr, variable: string, x: number, isApproximate = false): boolean {
  if (!Number.isFinite(x)) return false;
  const leftValue = evaluate(left, { [variable]: x });
  const rightValue = evaluate(right, { [variable]: x });
  if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return false;
  const tolerance = isApproximate ? APPROXIMATE_TOLERANCE : EXACT_TOLERANCE;
  const scale = Math.max(1, Math.abs(leftValue), Math.abs(rightValue));
  return Math.abs(leftValue - rightValue) <= tolerance * scale;
}

// Fixed sample points for the "is this true for every x?" test. Irrational-looking values
// make an accidental zero at all of them practically impossible.
const SAMPLE_POINTS = [-7.31, -2.17, -0.43, 0.618, 1.414, 3.3, 9.87];

/** Probabilistic identity test (Schwartz–Zippel style): F(x) ≈ 0 at every sample point. */
export function looksIdenticallyZero(expr: Expr, variable: string): boolean {
  let definedSamples = 0;
  for (const x of SAMPLE_POINTS) {
    const value = evaluate(expr, { [variable]: x });
    if (!Number.isFinite(value)) continue;
    if (Math.abs(value) > 1e-9) return false;
    definedSamples++;
  }
  return definedSamples >= 3;
}
