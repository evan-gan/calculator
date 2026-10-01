import { containsVariable } from '../../ast/inspect';
import { num, PI, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { Rational } from '../../number/rational';
import { degreeOf, monicPolynomial, shiftPolynomial, type RationalPolynomial } from '../../number/rationalPolynomial';
import { powerOf, productOf } from '../../operations/arithmetic';
import { evaluatePolynomial } from '../../solve/polynomial/rationalRoots';
import { factorRationalRoots } from '../integrate/partialFractions';
import { toRationalFunction, type RationalFunction } from '../readRationalFunction';
import { PRODUCT_DIVERGES_MESSAGE } from './messages';

// Exact Π_{n=a}^{∞} f(n) for rational functions f. Writing f(n) = Π (n - αᵢ)^eᵢ over its rational
// roots, a partial product is Π Γ(N + 1 - αᵢ)^eᵢ / Γ(a - αᵢ)^eᵢ; it converges exactly when f → 1
// (equal degrees and leading coefficients) and Σ eᵢ·αᵢ = 0, and then
//   Π_{n=a}^{∞} f(n) = Π Γ(a - αᵢ)^(-eᵢ).
// Γ values at whole numbers are factorials, at halves multiples of √π (which is how Wallis's
// product gives π/2), and other fractions cancel when their exponents add up to 0.
// Factors without rational roots are allowed when the top one is the bottom one shifted,
// P(n) = Q(n + s): then Π Q(n + s)/Q(n) telescopes to 1/(Q(a)·…·Q(a + s - 1)).
// (n³ - 1)/(n³ + 1) = (n - 1)(n² + n + 1) / ((n + 1)(n² - n + 1)) is of that kind.

// Γ(x + t)/Γ(x) takes t multiplications; this caps the work for products starting far out.
const MAX_GAMMA_STEPS = 10_000;
const MAX_SHIFT = 100;

type RootExponent = { root: Rational; exponent: number };

/** Rational roots of N (exponent +multiplicity) and D (-multiplicity), and what is left of each. */
function factorBothSides(fraction: RationalFunction): { roots: RootExponent[]; restTop: RationalPolynomial; restBottom: RationalPolynomial } {
  const exponents = new Map<string, RootExponent>();
  const collect = (polynomial: RationalPolynomial, sign: 1 | -1) => {
    const { roots, remaining } = factorRationalRoots(polynomial);
    for (const { root, multiplicity } of roots) {
      const previous = exponents.get(root.toString())?.exponent ?? 0;
      exponents.set(root.toString(), { root, exponent: previous + sign * multiplicity });
    }
    return monicPolynomial(remaining);
  };
  const restTop = collect(fraction.numerator, 1);
  const restBottom = collect(fraction.denominator, -1);
  return { roots: [...exponents.values()].filter(({ exponent }) => exponent !== 0), restTop, restBottom };
}

const samePolynomial = (first: RationalPolynomial, second: RationalPolynomial) =>
  first.length === second.length && first.every((coefficient, index) => coefficient.equals(second[index]));

/**
 * The whole-number s with top(n) = bottom(n + s), 0 when both are constant, or null when the
 * leftover factors aren't shifts of each other. Comparing the n^(d-1) coefficients gives s.
 */
function shiftBetween(top: RationalPolynomial, bottom: RationalPolynomial): number | null {
  const degree = degreeOf(top);
  if (degree !== degreeOf(bottom)) return null;
  if (degree < 1) return 0;
  const shift = top[degree - 1].sub(bottom[degree - 1]).div(Rational.fromInt(degree));
  if (!shift.isInteger() || shift.abs().compare(Rational.fromInt(MAX_SHIFT)) > 0) return null;
  return samePolynomial(shiftPolynomial(bottom, shift), top) ? Number(shift.numerator) : null;
}

function assertConverges(fraction: RationalFunction, roots: RootExponent[], shiftDrift: Rational): void {
  const leadingRatio = fraction.numerator[fraction.numerator.length - 1].div(fraction.denominator[fraction.denominator.length - 1]);
  if (degreeOf(fraction.numerator) !== degreeOf(fraction.denominator) || !leadingRatio.isOne()) {
    throw new MathError(`${PRODUCT_DIVERGES_MESSAGE} (Its factors don't approach 1.)`);
  }
  // log f(n) ≈ (Σ eᵢαᵢ)/n for large n, whose sum diverges unless the coefficient is 0.
  const drift = roots.reduce((total, { root, exponent }) => total.add(root.mul(Rational.fromInt(exponent))), shiftDrift);
  if (!drift.isZero()) throw new MathError(`${PRODUCT_DIVERGES_MESSAGE} (Its factors approach 1 too slowly.)`);
}

/**
 * Multiply out f(start)…f(last) for the last whole-number root at or above the start, where the
 * Γ formula would hit a pole. Returns that product and where the formula takes over; the
 * product is 0 when a factor is exactly 0.
 */
function initialFactors(fraction: RationalFunction, roots: RootExponent[], index: string, start: bigint): { value: Rational; next: bigint } {
  const wholeRoots = roots.filter(({ root }) => root.isInteger() && root.numerator >= start).map(({ root }) => root.numerator);
  if (wholeRoots.length === 0) return { value: Rational.ONE, next: start };
  const last = wholeRoots.reduce((largest, root) => (root > largest ? root : largest));
  let value = Rational.ONE;
  for (let n = start; n <= last; n++) {
    const point = Rational.fromInt(n);
    const bottom = evaluatePolynomial(fraction.denominator, point);
    if (bottom.isZero()) throw new MathError(`This product divides by zero at ${index} = ${n}.`);
    value = value.mul(evaluatePolynomial(fraction.numerator, point).div(bottom));
    if (value.isZero()) break;
  }
  return { value, next: last + 1n };
}

/** Γ(x) = Γ(φ)·ratio with φ the fractional part of x in (0, 1]. Null when that takes too many steps. */
function splitGamma(x: Rational): { fractional: Rational; ratio: Rational } | null {
  let fractional = x.sub(Rational.fromInt(x.floor()));
  if (fractional.isZero()) fractional = Rational.ONE;
  const steps = x.sub(fractional).numerator; // a whole number, possibly negative
  if (steps > BigInt(MAX_GAMMA_STEPS) || -steps > BigInt(MAX_GAMMA_STEPS)) return null;
  let ratio = Rational.ONE;
  // Γ(φ + t) = Γ(φ)·φ(φ + 1)…(φ + t - 1), and Γ(φ - t) = Γ(φ)/((φ - 1)…(φ - t)).
  for (let step = 0n; step < steps; step++) ratio = ratio.mul(fractional.add(Rational.fromInt(step)));
  for (let step = 1n; step <= -steps; step++) ratio = ratio.div(fractional.sub(Rational.fromInt(step)));
  return { fractional, ratio };
}

/** Π Γ(start - α)^(-e) exactly, or null when a Γ of a fraction other than 1/2 is left over. */
function gammaProduct(roots: RootExponent[], start: bigint): Expr | null {
  let rational = Rational.ONE;
  const gammaPowers = new Map<string, number>();
  for (const { root, exponent } of roots) {
    const split = splitGamma(Rational.fromInt(start).sub(root));
    if (!split) return null;
    rational = rational.mul(split.ratio.pow(BigInt(-exponent)));
    const key = split.fractional.toString();
    gammaPowers.set(key, (gammaPowers.get(key) ?? 0) - exponent);
  }
  let piPower = 0;
  for (const [fractional, power] of gammaPowers) {
    if (power === 0 || fractional === '1') continue;
    // Γ(1/2) = √π
    if (fractional !== '1/2') return null;
    piPower += power;
  }
  return productOf(num(rational), powerOf(PI, num(new Rational(BigInt(piPower), 2n))));
}

/** Π_{n=start}^{∞} top(n)/bottom(n) with top(n) = bottom(n + shift): only the first |shift| factors survive. */
function shiftedPairProduct(top: RationalPolynomial, bottom: RationalPolynomial, shift: number, start: bigint): Rational {
  let product = Rational.ONE;
  for (let j = 0; j < Math.abs(shift); j++) {
    const point = Rational.fromInt(start + BigInt(j));
    product = shift > 0 ? product.div(evaluatePolynomial(bottom, point)) : product.mul(evaluatePolynomial(top, point));
  }
  return product;
}

/**
 * Exact Π_{index=lower}^{∞} term, or null when no formula applies.
 * Throws MathError when the product diverges or a factor divides by zero.
 */
export function exactInfiniteProduct(term: Expr, index: string, lower: bigint): Expr | null {
  if (!containsVariable(term, index)) {
    if (term.type === 'num' && (term.value.isOne() || term.value.isZero())) return term;
    throw new MathError(`${PRODUCT_DIVERGES_MESSAGE} (Its factors don't approach 1.)`);
  }
  const fraction = toRationalFunction(term, index);
  if (!fraction || fraction.numerator.length === 0) return null;
  const { roots, restTop, restBottom } = factorBothSides(fraction);
  const shift = shiftBetween(restTop, restBottom);
  if (shift === null) return null;
  // First, so a factor dividing by zero is reported as such rather than as divergence.
  const { value, next } = initialFactors(fraction, roots, index, lower);
  // A degree-d factor shifted by s contributes like d roots each moved by -s.
  assertConverges(fraction, roots, Rational.fromInt(-shift * degreeOf(restTop)));
  if (value.isZero()) return num(0);
  const tail = gammaProduct(roots, next);
  if (!tail) return null;
  return productOf(num(value.mul(shiftedPairProduct(restTop, restBottom, shift, next))), tail);
}
