import { add, func, mul, num, pow, variable as variableNode, type Expr } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { differenceOf, negated, powerOf, productOf, quotientOf, squareRootOf, sumOf } from '../../operations/arithmetic';
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

/**
 * ∫ dx / Q^k for Q = px² + qx + s by the reduction formula, with Δ' = 4ps - q²:
 * I_k = (2px + q)/((k - 1)Δ'·Q^(k-1)) + 2p(2k - 3)/((k - 1)Δ')·I_(k-1).
 */
function integrateReciprocalQuadraticPower(coefficients: QuadraticCoefficients, power: number, variable: string): Expr | null {
  if (power === 1) return integrateReciprocalQuadratic(coefficients, variable);
  const previous = integrateReciprocalQuadraticPower(coefficients, power - 1, variable);
  const reducedDiscriminant = negated(discriminantOf(coefficients));
  if (!previous || numericSign(reducedDiscriminant) === 0) return null;
  const { p } = coefficients;
  const scale = productOf(num(power - 1), reducedDiscriminant);
  const linear = simplify(add(mul(num(2), p, variableNode(variable)), coefficients.q));
  // Built as (1/scale)·linear·Q^(1-k) so the constant isn't multiplied into Q: x/(2(x² + 1)), not 2x/(4x² + 4).
  const boundary = productOf(quotientOf(num(1), scale), linear, powerOf(simplify(quadraticExpr(coefficients, variable)), num(1 - power)));
  return sumOf(boundary, productOf(quotientOf(productOf(num(2), p, num(2 * power - 3)), scale), previous));
}

/**
 * ∫ (Bx + C)/(px² + qx + s)^k dx. The numerator is split as B/(2p)·Q' plus a constant:
 * the Q' part integrates to a logarithm (k = 1) or a power of Q, the rest by the reciprocal rule.
 */
export function integrateLinearOverQuadraticPower(
  numerator: { slope: Expr; constant: Expr },
  coefficients: QuadraticCoefficients,
  power: number,
  variable: string,
): Expr | null {
  const logScale = quotientOf(numerator.slope, productOf(num(2), coefficients.p));
  const reciprocalScale = differenceOf(numerator.constant, productOf(logScale, coefficients.q));
  const isReciprocalNeeded = !(reciprocalScale.type === 'num' && reciprocalScale.value.isZero());
  const reciprocal = isReciprocalNeeded ? integrateReciprocalQuadraticPower(coefficients, power, variable) : num(0);
  if (!reciprocal) return null;
  const quadratic = simplify(quadraticExpr(coefficients, variable));
  // ∫ Q'/Q^k = ln|Q| for k = 1, Q^(1-k)/(1-k) otherwise.
  const derivativePart = power === 1 ? logOfQuadratic(coefficients, variable) : quotientOf(powerOf(quadratic, num(1 - power)), num(1 - power));
  return sumOf(productOf(logScale, derivativePart), productOf(reciprocalScale, reciprocal));
}
