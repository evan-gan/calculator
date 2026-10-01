import { fraction, num, type Expr } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { negated, powerOf } from '../../operations/arithmetic';

/**
 * Real solutions of y^n = value for a positive integer n.
 * Odd n has exactly one real root (∛-8 = -2); even n has ± roots for positive values
 * and none for negative values.
 */
export function solvePurePower(degree: bigint, value: Expr): Expr[] {
  const root = (radicand: Expr) => powerOf(radicand, fraction(1n, degree));
  if (degree % 2n === 1n) return [root(value)];
  const sign = numericSign(value);
  if (sign === null || sign < 0) return [];
  if (sign === 0) return [num(0)];
  const positiveRoot = root(value);
  return [positiveRoot, negated(positiveRoot)];
}
