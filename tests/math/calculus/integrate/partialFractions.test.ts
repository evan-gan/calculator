import { describe, expect, test } from 'vitest';
import { decomposePartialFractions } from '../../../../src/math/calculus/integrate/partialFractions';
import { Rational } from '../../../../src/math/number/rational';
import type { RationalPolynomial } from '../../../../src/math/number/rationalPolynomial';

const poly = (...values: number[]): RationalPolynomial => values.map((value) => Rational.fromInt(value));
const describeFractions = (numerator: RationalPolynomial, denominator: RationalPolynomial) => {
  const result = decomposePartialFractions(numerator, denominator);
  return {
    linear: result.linear.map(({ root, power, coefficient }) => `${coefficient}/(x-${root})^${power}`),
    irreducible: result.irreducible && {
      numerator: result.irreducible.numerator.map(String),
      denominator: result.irreducible.denominator.map(String),
    },
  };
};

describe('partial fractions', () => {
  test('1/(x² - 1) = (1/2)/(x - 1) - (1/2)/(x + 1)', () => {
    expect(describeFractions(poly(1), poly(-1, 0, 1))?.linear.sort()).toEqual(['-1/2/(x--1)^1', '1/2/(x-1)^1']);
  });

  test('repeated roots: 1/x² is a single power term', () => {
    expect(describeFractions(poly(1), poly(0, 0, 1))).toEqual({ linear: ['1/(x-0)^2'], irreducible: null });
  });

  test('a leftover quadratic: 1/(x³ + x) = 1/x - x/(x² + 1)', () => {
    expect(describeFractions(poly(1), poly(0, 1, 0, 1))).toEqual({
      linear: ['1/(x-0)^1'],
      irreducible: { numerator: ['0', '-1'], denominator: ['1', '0', '1'] },
    });
  });

  test('a factor without rational roots of any degree is left whole: 1/(x⁵ + x) = 1/x - x³/(x⁴ + 1)', () => {
    expect(describeFractions(poly(1), poly(0, 1, 0, 0, 0, 1))).toEqual({
      linear: ['1/(x-0)^1'],
      irreducible: { numerator: ['0', '0', '0', '-1'], denominator: ['1', '0', '0', '0', '1'] },
    });
  });
});
