import { describe, expect, test } from 'vitest';
import { Rational } from '../../../src/math/number/rational';
import {
  dividePolynomials,
  gcdPolynomials,
  monicPolynomial,
  multiplyPolynomials,
  powerSeriesQuotient,
  shiftPolynomial,
  type RationalPolynomial,
} from '../../../src/math/number/rationalPolynomial';

const poly = (...values: number[]): RationalPolynomial => values.map((value) => Rational.fromInt(value));
const text = (polynomial: RationalPolynomial) => polynomial.map(String);

describe('rational polynomials (lowest degree first)', () => {
  test('multiply: (1 + x)(1 - x) = 1 - x²', () => {
    expect(text(multiplyPolynomials(poly(1, 1), poly(1, -1)))).toEqual(['1', '0', '-1']);
  });

  test('long division: x³ + 1 = (x² - x + 1)(x + 1)', () => {
    const { quotient, remainder } = dividePolynomials(poly(1, 0, 0, 1), poly(1, 1));
    expect(text(quotient)).toEqual(['1', '-1', '1']);
    expect(remainder).toEqual([]);
  });

  test('long division with a remainder: x² + 1 = x·x + 1', () => {
    const { quotient, remainder } = dividePolynomials(poly(1, 0, 1), poly(0, 1));
    expect(text(quotient)).toEqual(['0', '1']);
    expect(text(remainder)).toEqual(['1']);
  });

  test('shift: x² around 1 is (1 + t)² = 1 + 2t + t²', () => {
    expect(text(shiftPolynomial(poly(0, 0, 1), Rational.ONE))).toEqual(['1', '2', '1']);
  });

  test('power series of 1/(1 - t) is 1 + t + t² + …', () => {
    expect(text(powerSeriesQuotient(poly(1), poly(1, -1), 4))).toEqual(['1', '1', '1', '1']);
  });

  test('gcd: (x - 1)(x + 2) and (x - 1)(x + 3) share x - 1', () => {
    expect(text(gcdPolynomials(poly(-2, 1, 1), poly(-3, 2, 1)))).toEqual(['-1', '1']);
  });

  test('gcd of polynomials with no common factor is 1', () => {
    expect(text(gcdPolynomials(poly(1, 0, 1), poly(-1, 1)))).toEqual(['1']);
  });

  test('monic: 2x² + 4 becomes x² + 2', () => {
    expect(text(monicPolynomial(poly(4, 0, 2)))).toEqual(['2', '0', '1']);
  });
});
