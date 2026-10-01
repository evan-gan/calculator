import { add, func, fraction, mul, num, PI, pow, sqrt, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';
import { simplify } from '../../simplify/simplify';

// Cardano's method for cubics with rational coefficients and no rational roots
// (those are removed first, since Cardano writes simple roots in an ugly way).

/**
 * Real roots of c0 + c1·x + c2·x² + c3·x³ = 0.
 *
 * Args:
 *   coefficients: four rational coefficients, low -> high, with c3 != 0
 *
 * Returns:
 *   Exact real roots: one root as a sum of cube roots when the discriminant is positive,
 *   otherwise three roots in trigonometric form.
 */
export function solveCubic(coefficients: Rational[]): Expr[] {
  const [d, c, b, a] = coefficients;
  // Monic form x³ + B x² + C x + D, then depress with x = t - B/3 to get t³ + p t + q.
  const B = b.div(a);
  const C = c.div(a);
  const D = d.div(a);
  const three = Rational.fromInt(3);
  const p = C.sub(B.mul(B).div(three));
  const q = Rational.fromInt(2).mul(B.pow(3n)).div(Rational.fromInt(27)).sub(B.mul(C).div(three)).add(D);
  const shift = num(B.div(three).neg());
  const halfQ = q.div(Rational.fromInt(2));
  const discriminant = halfQ.mul(halfQ).add(p.div(three).pow(3n));

  if (discriminant.isZero()) {
    if (p.isZero()) return [simplify(shift)];
    // Repeated root: t = 3q/p once and t = -3q/(2p) twice.
    const singleRoot = three.mul(q).div(p);
    const doubleRoot = singleRoot.div(Rational.fromInt(-2));
    return [singleRoot, doubleRoot].map((t) => simplify(add(num(t), shift)));
  }
  if (!discriminant.isNegative()) {
    // t = ∛(-q/2 + √Δ) + ∛(-q/2 - √Δ)
    const rootDelta = sqrt(num(discriminant));
    const cubeRoot = (inner: Expr) => pow(inner, fraction(1, 3));
    const t = add(cubeRoot(add(num(halfQ.neg()), rootDelta)), cubeRoot(add(num(halfQ.neg()), mul(num(-1), rootDelta))));
    return [simplify(add(t, shift))];
  }
  // Three real roots: t_k = 2√(-p/3)·cos(⅓·arccos((3q/2p)·√(-3/p)) - 2πk/3)
  const amplitude = mul(num(2), sqrt(num(p.neg().div(three))));
  const angle = mul(fraction(1, 3), func('arccos', mul(num(three.mul(q).div(p.mul(Rational.fromInt(2)))), sqrt(num(three.neg().div(p))))));
  return [0, 1, 2].map((k) =>
    simplify(add(mul(amplitude, func('cos', add(angle, mul(fraction(-2 * k, 3), PI)))), shift)),
  );
}
