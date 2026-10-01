import { describe, expect, test } from 'vitest';
import { Rational } from '../../../src/math/number/rational';
import { MathError } from '../../../src/math/errors';

describe('Rational', () => {
  test('parses decimals exactly from text so 0.1 + 0.2 is exactly 3/10', () => {
    expect(Rational.parse('0.1').add(Rational.parse('0.2')).toString()).toBe('3/10');
  });

  test('always stores reduced form with a positive denominator', () => {
    const value = new Rational(6n, -8n);
    expect(value.numerator).toBe(-3n);
    expect(value.denominator).toBe(4n);
  });

  test('parses integers, trailing zeros and leading-dot decimals', () => {
    expect(Rational.parse('-3').toString()).toBe('-3');
    expect(Rational.parse('2.50').toString()).toBe('5/2');
    expect(Rational.parse('.125').toString()).toBe('1/8');
  });

  test('rejects malformed numbers with a helpful error', () => {
    expect(() => Rational.parse('1.2.3')).toThrow(MathError);
    expect(() => Rational.parse('.')).toThrow(MathError);
  });

  test('throws a MathError on division by zero', () => {
    expect(() => Rational.ONE.div(Rational.ZERO)).toThrow('Division by zero');
  });

  test('raises to negative integer powers', () => {
    expect(new Rational(2n, 3n).pow(-2n).toString()).toBe('9/4');
  });

  test('floor rounds toward negative infinity', () => {
    expect(new Rational(7n, 2n).floor()).toBe(3n);
    expect(new Rational(-7n, 2n).floor()).toBe(-4n);
  });

  test('converts huge values to floats without overflowing to NaN', () => {
    const huge = new Rational(10n ** 400n + 1n, 10n ** 399n);
    expect(huge.toNumber()).toBeCloseTo(10, 10);
  });
});
