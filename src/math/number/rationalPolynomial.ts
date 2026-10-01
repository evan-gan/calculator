import { add, mul, num, pow, variable, type Expr } from '../ast/nodes';
import { Rational } from './rational';

// Polynomials with exact rational coefficients, stored lowest degree first:
// [1, 0, 3] is 1 + 3x². Always trimmed so the last entry is non-zero ([] is the zero polynomial).

export type RationalPolynomial = Rational[];

export function trimPolynomial(coefficients: Rational[]): RationalPolynomial {
  let end = coefficients.length;
  while (end > 0 && coefficients[end - 1].isZero()) end--;
  return coefficients.slice(0, end);
}

/** -1 for the zero polynomial. */
export function degreeOf(polynomial: RationalPolynomial): number {
  return polynomial.length - 1;
}

export function addPolynomials(first: RationalPolynomial, second: RationalPolynomial): RationalPolynomial {
  const length = Math.max(first.length, second.length);
  const sum = Array.from({ length }, (_, index) => (first[index] ?? Rational.ZERO).add(second[index] ?? Rational.ZERO));
  return trimPolynomial(sum);
}

export function scalePolynomial(polynomial: RationalPolynomial, factor: Rational): RationalPolynomial {
  return trimPolynomial(polynomial.map((coefficient) => coefficient.mul(factor)));
}

export function subtractPolynomials(first: RationalPolynomial, second: RationalPolynomial): RationalPolynomial {
  return addPolynomials(first, scalePolynomial(second, Rational.MINUS_ONE));
}

export function multiplyPolynomials(first: RationalPolynomial, second: RationalPolynomial): RationalPolynomial {
  if (first.length === 0 || second.length === 0) return [];
  const product = Array.from({ length: first.length + second.length - 1 }, () => Rational.ZERO);
  first.forEach((left, i) => second.forEach((right, j) => (product[i + j] = product[i + j].add(left.mul(right)))));
  return trimPolynomial(product);
}

/** Long division: dividend = quotient·divisor + remainder with deg(remainder) < deg(divisor). */
export function dividePolynomials(
  dividend: RationalPolynomial,
  divisor: RationalPolynomial,
): { quotient: RationalPolynomial; remainder: RationalPolynomial } {
  if (divisor.length === 0) throw new Error('Polynomial division by zero');
  let remainder = trimPolynomial(dividend);
  const quotient = Array.from({ length: Math.max(remainder.length - divisor.length + 1, 0) }, () => Rational.ZERO);
  const leading = divisor[divisor.length - 1];
  while (remainder.length >= divisor.length) {
    const shift = remainder.length - divisor.length;
    const factor = remainder[remainder.length - 1].div(leading);
    quotient[shift] = factor;
    const subtrahend = [...Array.from({ length: shift }, () => Rational.ZERO), ...divisor.map((term) => term.mul(factor))];
    // The leading terms cancel exactly; dropping the top entry guarantees progress.
    remainder = trimPolynomial(subtractPolynomials(remainder, subtrahend).slice(0, remainder.length - 1));
  }
  return { quotient: trimPolynomial(quotient), remainder };
}

function binomial(n: number, k: number): bigint {
  let result = 1n;
  for (let step = 1; step <= k; step++) result = (result * BigInt(n - k + step)) / BigInt(step);
  return result;
}

/** Coefficients of p(center + t) as a polynomial in t (a Taylor expansion around `center`). */
export function shiftPolynomial(polynomial: RationalPolynomial, center: Rational): RationalPolynomial {
  // (center + t)^i contributes C(i, j)·center^(i-j) to the t^j coefficient.
  const shifted = polynomial.map(() => Rational.ZERO);
  polynomial.forEach((coefficient, i) => {
    for (let j = 0; j <= i; j++) {
      const contribution = coefficient.mul(Rational.fromInt(binomial(i, j))).mul(center.pow(BigInt(i - j)));
      shifted[j] = shifted[j].add(contribution);
    }
  });
  return trimPolynomial(shifted);
}

/** First `count` coefficients of the power series numerator/denominator (denominator[0] must be non-zero). */
export function powerSeriesQuotient(numerator: RationalPolynomial, denominator: RationalPolynomial, count: number): Rational[] {
  const series: Rational[] = [];
  for (let k = 0; k < count; k++) {
    let value = numerator[k] ?? Rational.ZERO;
    for (let j = 1; j <= k; j++) value = value.sub((denominator[j] ?? Rational.ZERO).mul(series[k - j]));
    series.push(value.div(denominator[0]));
  }
  return series;
}

/** Read Expr coefficients (from toPolynomial) as rationals; null if any isn't a plain number. */
export function toRationalPolynomial(coefficients: Expr[]): RationalPolynomial | null {
  const rationals: Rational[] = [];
  for (const coefficient of coefficients) {
    if (coefficient.type !== 'num') return null;
    rationals.push(coefficient.value);
  }
  return trimPolynomial(rationals);
}

/** Build an (unsimplified) expression tree for the polynomial at a variable name or an expression. */
export function polynomialToExpr(polynomial: RationalPolynomial, point: Expr | string): Expr {
  const base = typeof point === 'string' ? variable(point) : point;
  // Degree 0 is the bare coefficient, so a point of 0 never builds 0^0.
  const terms = polynomial.map((coefficient, degree) => (degree === 0 ? num(coefficient) : mul(num(coefficient), pow(base, num(degree)))));
  return terms.length === 0 ? num(0) : add(...terms);
}
