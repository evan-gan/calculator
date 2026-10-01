import { lcmBig, positiveDivisors } from '../../number/integer';
import { Rational } from '../../number/rational';

// Rational root theorem: every rational root p/q of an integer polynomial has
// p dividing the constant term and q dividing the leading coefficient.

/** Evaluate a polynomial (coefficients low -> high) at a rational point with Horner's rule. */
export function evaluatePolynomial(coefficients: Rational[], point: Rational): Rational {
  let result = Rational.ZERO;
  for (let degree = coefficients.length - 1; degree >= 0; degree--) {
    result = result.mul(point).add(coefficients[degree]);
  }
  return result;
}

/** Divide by (x - root). Coefficients low -> high; the remainder is assumed to be zero. */
export function deflate(coefficients: Rational[], root: Rational): Rational[] {
  const degree = coefficients.length - 1;
  const quotient: Rational[] = new Array(degree);
  let carry = Rational.ZERO;
  for (let index = degree; index >= 1; index--) {
    carry = carry.mul(root).add(coefficients[index]);
    quotient[index - 1] = carry;
  }
  return quotient;
}

/** Scale rational coefficients to integers by multiplying by the lcm of the denominators. */
function toIntegerCoefficients(coefficients: Rational[]): bigint[] {
  const scale = coefficients.reduce((lcm, coefficient) => lcmBig(lcm, coefficient.denominator), 1n);
  return coefficients.map((coefficient) => (coefficient.numerator * scale) / coefficient.denominator);
}

function candidateRoots(coefficients: Rational[]): Rational[] | null {
  const integers = toIntegerCoefficients(coefficients);
  const constantDivisors = positiveDivisors(integers[0]);
  const leadingDivisors = positiveDivisors(integers[integers.length - 1]);
  if (!constantDivisors || !leadingDivisors) return null;
  const candidates = new Map<string, Rational>();
  for (const p of constantDivisors) {
    for (const q of leadingDivisors) {
      for (const candidate of [new Rational(p, q), new Rational(-p, q)]) candidates.set(candidate.toString(), candidate);
    }
  }
  return [...candidates.values()];
}

/**
 * Pull out every rational root.
 *
 * Args:
 *   coefficients: rational coefficients low -> high, constant term non-zero
 *
 * Returns:
 *   roots: distinct rational roots found
 *   remaining: the deflated polynomial that has no rational roots left
 */
export function extractRationalRoots(coefficients: Rational[]): { roots: Rational[]; remaining: Rational[] } {
  let remaining = coefficients;
  const roots: Rational[] = [];
  const candidates = candidateRoots(coefficients);
  if (!candidates) return { roots, remaining };
  for (const candidate of candidates) {
    let found = false;
    // Repeat so roots with multiplicity (like (x-1)²) are fully divided out.
    while (remaining.length > 1 && evaluatePolynomial(remaining, candidate).isZero()) {
      remaining = deflate(remaining, candidate);
      found = true;
    }
    if (found) roots.push(candidate);
  }
  return { roots, remaining };
}
