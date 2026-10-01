import { describe, expect, test } from 'vitest';
import { bernoulliNumber, powerSumPolynomial } from '../../../../src/math/calculus/series/bernoulli';
import { Rational } from '../../../../src/math/number/rational';

describe('Bernoulli numbers and power sums', () => {
  test('first Bernoulli numbers', () => {
    expect(bernoulliNumber(1).toString()).toBe('-1/2');
    expect(bernoulliNumber(2).toString()).toBe('1/6');
    expect(bernoulliNumber(3).toString()).toBe('0');
    expect(bernoulliNumber(4).toString()).toBe('-1/30');
  });

  test('Σ n² = m³/3 + m²/2 + m/6', () => {
    expect(powerSumPolynomial(2).map(String)).toEqual(['0', '1/6', '1/2', '1/3']);
    expect(powerSumPolynomial(0)).toEqual([Rational.ZERO, Rational.ONE]);
  });
});
