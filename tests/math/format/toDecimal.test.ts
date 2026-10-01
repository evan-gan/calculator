import { describe, expect, test } from 'vitest';
import { floatToLatex, rationalToDecimalLatex } from '../../../src/math/format/toDecimal';
import { Rational } from '../../../src/math/number/rational';

describe('decimal formatting', () => {
  test('rationals are converted exactly and rounded to 12 significant digits', () => {
    expect(rationalToDecimalLatex(new Rational(1n, 8n))).toBe('0.125');
    expect(rationalToDecimalLatex(new Rational(2n, 3n))).toBe('0.666666666667');
    expect(rationalToDecimalLatex(new Rational(-1n, 3n))).toBe('-0.333333333333');
    expect(rationalToDecimalLatex(Rational.fromInt(1024))).toBe('1024');
  });

  test('very large and very small values use scientific notation', () => {
    expect(rationalToDecimalLatex(Rational.fromInt(10n ** 20n))).toBe('1\\times10^{20}');
    expect(rationalToDecimalLatex(new Rational(1n, 10n ** 9n))).toBe('1\\times10^{-9}');
    expect(floatToLatex(1.5e21)).toBe('1.5\\times10^{21}');
  });

  test('float noise near zero shows as 0 and NaN shows as undefined', () => {
    expect(floatToLatex(1.2e-16)).toBe('0');
    expect(floatToLatex(NaN)).toBe('\\text{undefined}');
  });
});
