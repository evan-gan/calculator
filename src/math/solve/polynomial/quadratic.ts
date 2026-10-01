import { num, type Expr } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { differenceOf, negated, productOf, quotientOf, squareRootOf, sumOf } from '../../operations/arithmetic';

/**
 * Real roots of a·x² + b·x + c = 0 via the quadratic formula, kept exact.
 * The simplifier reduces (6 ± 2√5)/2 to 3 ± √5 on its own.
 */
export function solveQuadratic(c: Expr, b: Expr, a: Expr): Expr[] {
  const discriminant = differenceOf(productOf(b, b), productOf(num(4), a, c));
  const sign = numericSign(discriminant);
  if (sign === null || sign < 0) return [];
  const twoA = productOf(num(2), a);
  const minusB = negated(b);
  if (sign === 0) return [quotientOf(minusB, twoA)];
  const rootOfDiscriminant = squareRootOf(discriminant);
  return [
    quotientOf(sumOf(minusB, rootOfDiscriminant), twoA),
    quotientOf(differenceOf(minusB, rootOfDiscriminant), twoA),
  ];
}
