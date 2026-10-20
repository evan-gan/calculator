import { describe, expect, test } from 'vitest';
import { calculate } from '../../../src/math';
import { floatToLatex, rationalToDecimalLatex } from '../../../src/math/format/toDecimal';
import { Rational } from '../../../src/math/number/rational';
import { solveLatex } from '../../helpers';

describe('scientific notation display', () => {
  test('rationals always print as a×10ⁿ with exact digits', () => {
    expect(rationalToDecimalLatex(Rational.fromInt(12345), 'scientific')).toBe('1.2345\\times10^{4}');
    expect(rationalToDecimalLatex(Rational.fromInt(7), 'scientific')).toBe('7\\times10^{0}');
    expect(rationalToDecimalLatex(new Rational(-1n, 8n), 'scientific')).toBe('-1.25\\times10^{-1}');
    expect(rationalToDecimalLatex(new Rational(2n, 3n), 'scientific')).toBe('6.66666666667\\times10^{-1}');
  });

  test('rounding up to the next power of ten moves the exponent', () => {
    const almostTen = new Rational(9_999_999_999_999n, 10n ** 12n);
    expect(rationalToDecimalLatex(almostTen, 'scientific')).toBe('1\\times10^{1}');
  });

  test('floats print as a×10ⁿ, but zero, ∞ and undefined stay as they are', () => {
    expect(floatToLatex(Math.PI, 'scientific')).toBe('3.14159265359\\times10^{0}');
    expect(floatToLatex(-0.00042, 'scientific')).toBe('-4.2\\times10^{-4}');
    expect(floatToLatex(1e-16, 'scientific')).toBe('0');
    expect(floatToLatex(Infinity, 'scientific')).toBe('\\infty');
    expect(floatToLatex(NaN, 'scientific')).toBe('\\text{undefined}');
  });

  test('a number result keeps its = or ≈ in scientific mode', () => {
    expect(calculate('12345')).toMatchObject({ result: { scientific: '=1.2345\\times10^{4}' } });
    expect(calculate('\\frac{1}{3}')).toMatchObject({ result: { scientific: '\\approx 3.33333333333\\times10^{-1}' } });
  });

  test('expressions with variables write their decimal coefficients in scientific notation', () => {
    expect(calculate('0.5x')).toMatchObject({ result: { scientific: '=5\\times10^{-1} x' } });
  });

  test('solution lines, including periodic ones, have a scientific version', () => {
    expect(solveLatex('2x=1').scientificLines).toEqual(['x=5\\times10^{-1}']);
    expect(solveLatex('\\tan\\left(x\\right)=1').scientificLines).toEqual([
      'x\\approx 7.85398163397\\times10^{-1}+3.14159265359\\times10^{0}n',
    ]);
  });

  test('outcomes with no solution lines have no scientific lines either', () => {
    expect(solveLatex('x^{2}=-1')).toMatchObject({ scientificLines: [], notes: ['No real solution.'] });
  });
});
