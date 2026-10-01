import { toKey } from '../../ast/inspect';
import { fraction, num, type Expr } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { Rational } from '../../number/rational';
import {
  degreeOf,
  dividePolynomials,
  gcdPolynomials,
  monicPolynomial,
  subtractPolynomials,
  type RationalPolynomial,
} from '../../number/rationalPolynomial';
import { differenceOf, negated, powerOf, productOf, quotientOf, squareRootOf, sumOf } from '../../operations/arithmetic';
import { extractRationalRoots } from '../../solve/polynomial/rationalRoots';

// Factoring a polynomial with no rational roots into real linear and quadratic factors, whose
// coefficients may be irrational: x⁴ + 1 = (x² + √2·x + 1)(x² - √2·x + 1), x³ + 2 = (x + ∛2)(x² - ∛2·x + ∛4).
// Repeated factors are separated first (square-free decomposition); then each square-free part
// is split: quadratics stay as they are, cubics a(x + h)³ + k, and quartics through Ferrari's
// method when its resolvent cubic has a rational root (always true for x⁴ + px² + r). Others give null.

/** A monic factor, coefficients lowest degree first: [c, 1] is x + c, [s, q, 1] is x² + qx + s. */
export interface RealFactor {
  coefficients: Expr[];
  multiplicity: number;
}

type MonicQuadratic = { linear: Expr; constant: Expr };

/** y² + βy + γ with y = x + shift, rewritten in x: x² + (β + 2·shift)x + (shift² + β·shift + γ). */
function shiftQuadratic({ linear, constant }: MonicQuadratic, shift: Expr): Expr[] {
  return [
    sumOf(productOf(shift, shift), productOf(linear, shift), constant),
    sumOf(linear, productOf(num(2), shift)),
    num(1),
  ];
}

/** Coefficients of p(y - shift) for a cubic or quartic, so the y^(n-1) term vanishes. */
function depress(monic: RationalPolynomial): { shift: Rational; depressed: RationalPolynomial } {
  const degree = degreeOf(monic);
  const shift = monic[degree - 1].div(Rational.fromInt(degree));
  // p(y - shift) by Horner's rule on polynomials in y.
  let result: Rational[] = [];
  for (let index = degree; index >= 0; index--) {
    const timesY = [Rational.ZERO, ...result];
    const timesShift = [...result.map((value) => value.mul(shift.neg())), Rational.ZERO];
    result = timesY.map((value, position) => value.add(timesShift[position] ?? Rational.ZERO));
    result[0] = result[0].add(monic[index]);
  }
  return { shift, depressed: result.slice(0, degree + 1) };
}

/** x³ + bx² + cx + d = (x + h)³ + k  ->  (x + h + ∛k)·((x + h)² - ∛k·(x + h) + ∛k²). Null for other cubics. */
function factorCubic(monic: RationalPolynomial): RealFactor[] | null {
  const { shift, depressed } = depress(monic);
  if (!depressed[1].isZero()) return null;
  const root = powerOf(num(depressed[0]), fraction(1, 3));
  const shiftExpr = num(shift);
  return [
    { coefficients: [sumOf(shiftExpr, root), num(1)], multiplicity: 1 },
    { coefficients: shiftQuadratic({ linear: negated(root), constant: productOf(root, root) }, shiftExpr), multiplicity: 1 },
  ];
}

/** y⁴ + py² + r as two quadratics in y. */
function splitBiquadratic(p: Rational, r: Rational): MonicQuadratic[] | null {
  const discriminant = p.mul(p).sub(r.mul(Rational.fromInt(4)));
  const discriminantSign = numericSign(num(discriminant));
  if (discriminantSign === null) return null;
  if (discriminantSign >= 0) {
    // (y² + α)(y² + β) with α + β = p and αβ = r.
    const root = squareRootOf(num(discriminant));
    const half = fraction(1, 2);
    return [
      { linear: num(0), constant: productOf(half, sumOf(num(p), root)) },
      { linear: num(0), constant: productOf(half, differenceOf(num(p), root)) },
    ];
  }
  // p² < 4r, so r > 0: y⁴ + py² + r = (y² + √r)² - (2√r - p)y², a difference of squares.
  const rootR = squareRootOf(num(r));
  const slope = squareRootOf(differenceOf(productOf(num(2), rootR), num(p)));
  return [
    { linear: slope, constant: rootR },
    { linear: negated(slope), constant: rootR },
  ];
}

/**
 * y⁴ + py² + qy + r with q ≠ 0 (Ferrari). For a root m > 0 of 8m³ + 8pm² + (2p² - 8r)m - q²,
 * with s = √(2m): (y² + sy + p/2 + m - q/(2s))·(y² - sy + p/2 + m + q/(2s)).
 */
function splitWithResolvent(p: Rational, q: Rational, r: Rational): MonicQuadratic[] | null {
  const eight = Rational.fromInt(8);
  const resolvent = [q.mul(q).neg(), p.mul(p).mul(Rational.fromInt(2)).sub(r.mul(eight)), p.mul(eight), eight];
  const m = extractRationalRoots(resolvent).roots.find((root) => !root.isNegative() && !root.isZero());
  if (!m) return null;
  const slope = squareRootOf(num(m.mul(Rational.fromInt(2))));
  const middle = num(p.div(Rational.fromInt(2)).add(m));
  const offset = quotientOf(num(q), productOf(num(2), slope));
  return [
    { linear: slope, constant: differenceOf(middle, offset) },
    { linear: negated(slope), constant: sumOf(middle, offset) },
  ];
}

function factorQuartic(monic: RationalPolynomial): RealFactor[] | null {
  const { shift, depressed } = depress(monic);
  const [r, q, p] = depressed;
  const halves = q.isZero() ? splitBiquadratic(p, r) : splitWithResolvent(p, q, r);
  if (!halves) return null;
  const factors = halves.map((half) => shiftQuadratic(half, num(shift)));
  const factorKeys = factors.map((coefficients) => coefficients.map(toKey).join(';'));
  // (x² + 1)² comes out as the same quadratic twice.
  if (factorKeys[0] === factorKeys[1]) return [{ coefficients: factors[0], multiplicity: 2 }];
  return factors.map((coefficients) => ({ coefficients, multiplicity: 1 }));
}

function factorSquareFree(monic: RationalPolynomial): RealFactor[] | null {
  switch (degreeOf(monic)) {
    case 1:
    case 2:
      return [{ coefficients: monic.map((coefficient) => num(coefficient)), multiplicity: 1 }];
    case 3:
      return factorCubic(monic);
    case 4:
      return factorQuartic(monic);
    default:
      return null;
  }
}

function derivativeOfPolynomial(polynomial: RationalPolynomial): RationalPolynomial {
  return polynomial.slice(1).map((coefficient, index) => coefficient.mul(Rational.fromInt(index + 1)));
}

/**
 * Yun's square-free decomposition: monic f = Π aᵢ^i with each aᵢ free of repeated factors,
 * so (x² + 2x + 2)³ is handled as one quadratic with multiplicity 3.
 */
function squareFreeParts(monic: RationalPolynomial): { part: RationalPolynomial; multiplicity: number }[] {
  const parts: { part: RationalPolynomial; multiplicity: number }[] = [];
  const derivative = derivativeOfPolynomial(monic);
  const common = gcdPolynomials(monic, derivative);
  let remaining = dividePolynomials(monic, common).quotient;
  let difference = subtractPolynomials(dividePolynomials(derivative, common).quotient, derivativeOfPolynomial(remaining));
  for (let multiplicity = 1; degreeOf(remaining) > 0; multiplicity++) {
    const part = gcdPolynomials(remaining, difference);
    if (degreeOf(part) > 0) parts.push({ part, multiplicity });
    remaining = dividePolynomials(remaining, part).quotient;
    const quotient = dividePolynomials(difference, part).quotient;
    difference = subtractPolynomials(quotient, derivativeOfPolynomial(remaining));
  }
  return parts;
}

/** Combine equal factors, adding their multiplicities. */
function mergeFactors(factors: RealFactor[]): RealFactor[] {
  const merged = new Map<string, RealFactor>();
  for (const factor of factors) {
    const key = factor.coefficients.map(toKey).join(';');
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, multiplicity: existing.multiplicity + factor.multiplicity } : factor);
  }
  return [...merged.values()];
}

/**
 * Monic real factors of a polynomial that has no rational roots, or null when it can't be split
 * exactly. The factors multiply to the polynomial divided by its leading coefficient.
 */
export function factorOverReals(polynomial: RationalPolynomial): RealFactor[] | null {
  const factors: RealFactor[] = [];
  for (const { part, multiplicity } of squareFreeParts(monicPolynomial(polynomial))) {
    const partFactors = factorSquareFree(part);
    if (!partFactors) return null;
    factors.push(...partFactors.map((factor) => ({ ...factor, multiplicity: factor.multiplicity * multiplicity })));
  }
  return mergeFactors(factors);
}
