import { add, func, mul, num, pow, variable as variableNode, type Expr } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { differenceOf, negated, productOf, quotientOf, squareRootOf, sumOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';

// Integrals over a quadratic p·x² + q·x + s with constant coefficients.

export interface QuadraticCoefficients {
  p: Expr;
  q: Expr;
  s: Expr;
}

function quadraticExpr({ p, q, s }: QuadraticCoefficients, variable: string): Expr {
  const x = variableNode(variable);
  return add(mul(p, pow(x, num(2))), mul(q, x), s);
}

export function discriminantOf({ p, q, s }: QuadraticCoefficients): Expr {
  return differenceOf(productOf(q, q), productOf(num(4), p, s));
}

/**
 * ∫ dx / (px² + qx + s), by the sign of the discriminant Δ = q² - 4ps:
 *   Δ < 0: 2/√-Δ · arctan((2px + q)/√-Δ)
 *   Δ > 0: 1/√Δ · (ln|x - r₁| - ln|x - r₂|) with roots r₁,₂ = (-q ± √Δ)/(2p)
 *   Δ = 0: -2/(2px + q)
 * Returns null when Δ's sign can't be decided (it contains other variables).
 */
export function integrateReciprocalQuadratic(coefficients: QuadraticCoefficients, variable: string): Expr | null {
  const discriminant = discriminantOf(coefficients);
  const sign = numericSign(discriminant);
  if (sign === null) return null;
  const linear = simplify(add(mul(num(2), coefficients.p, variableNode(variable)), coefficients.q));
  if (sign === 0) return quotientOf(num(-2), linear);
  if (sign < 0) {
    const root = squareRootOf(negated(discriminant));
    return productOf(quotientOf(num(2), root), func('arctan', quotientOf(linear, root)));
  }
  const root = squareRootOf(discriminant);
  const twiceLeading = productOf(num(2), coefficients.p);
  const firstRoot = quotientOf(differenceOf(root, coefficients.q), twiceLeading);
  const secondRoot = quotientOf(negated(sumOf(coefficients.q, root)), twiceLeading);
  const x = variableNode(variable);
  const logDistance = (point: Expr) => func('ln', func('abs', add(x, mul(num(-1), point))));
  return quotientOf(simplify(add(logDistance(firstRoot), mul(num(-1), logDistance(secondRoot)))), root);
}

/** ln|px² + qx + s|, written without the bars when the quadratic never changes sign. */
export function logOfQuadratic(coefficients: QuadraticCoefficients, variable: string): Expr {
  const quadratic = simplify(quadraticExpr(coefficients, variable));
  const hasNoRealRoots = numericSign(discriminantOf(coefficients)) === -1;
  const leadingSign = numericSign(coefficients.p);
  if (hasNoRealRoots && leadingSign === 1) return func('ln', quadratic);
  if (hasNoRealRoots && leadingSign === -1) return func('ln', negated(quadratic));
  return func('ln', func('abs', quadratic));
}
