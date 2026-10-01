import { describe, expect, test } from 'vitest';
import { factorOverReals } from '../../../../src/math/calculus/integrate/realFactors';
import { toLatex } from '../../../../src/math/format/toLatex';
import { Rational } from '../../../../src/math/number/rational';
import type { RationalPolynomial } from '../../../../src/math/number/rationalPolynomial';

const poly = (...values: number[]): RationalPolynomial => values.map((value) => Rational.fromInt(value));

/** Each factor as "coefficients low→high ^multiplicity". */
function describeFactors(polynomial: RationalPolynomial): string[] | null {
  const factors = factorOverReals(polynomial);
  return factors && factors.map(({ coefficients, multiplicity }) => `[${coefficients.map(toLatex).join(', ')}]^${multiplicity}`);
}

describe('splitting polynomials without rational roots into real factors', () => {
  test('x⁴ + 1 = (x² - √2x + 1)(x² + √2x + 1)', () => {
    expect(describeFactors(poly(1, 0, 0, 0, 1))).toEqual(['[1, \\sqrt{2}, 1]^1', '[1, -\\sqrt{2}, 1]^1']);
  });

  test('x⁴ - 2 = (x² + √2)(x² - √2): a biquadratic with real roots in x²', () => {
    expect(describeFactors(poly(-2, 0, 0, 0, 1))).toEqual(['[\\sqrt{2}, 0, 1]^1', '[-\\sqrt{2}, 0, 1]^1']);
  });

  test('a quartic with an x term uses the resolvent cubic: x⁴ + 2x² + x + 2 = (x² + x + 1)(x² - x + 2)', () => {
    expect(describeFactors(poly(2, 1, 2, 0, 1))).toEqual(['[1, 1, 1]^1', '[2, -1, 1]^1']);
  });

  test('pure cubics: x³ + 2 = (x + ∛2)(x² - ∛2x + ∛4)', () => {
    expect(describeFactors(poly(2, 0, 0, 1))).toEqual(['[\\sqrt[3]{2}, 1]^1', '[\\sqrt[3]{4}, -\\sqrt[3]{2}, 1]^1']);
  });

  test('repeated factors are found first: (x² + 1)³', () => {
    expect(describeFactors(poly(1, 0, 3, 0, 3, 0, 1))).toEqual(['[1, 0, 1]^3']);
  });

  test('the leading coefficient is divided out: 2x² + 2 gives x² + 1', () => {
    expect(describeFactors(poly(2, 0, 2))).toEqual(['[1, 0, 1]^1']);
  });

  test('cubics and quartics that need general radical formulas are not split', () => {
    expect(describeFactors(poly(1, 1, 0, 1))).toBeNull();
    expect(describeFactors(poly(1, 1, 0, 0, 1))).toBeNull();
  });
});
