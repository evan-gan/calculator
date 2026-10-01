import { describe, expect, test } from 'vitest';
import { calculate } from '../../../src/math';
import { simplifyLatex } from '../../helpers';

describe('definite integrals', () => {
  test.each([
    ['\\int _0^1x^{2}dx', '\\frac{1}{3}'],
    ['\\int _0^{\\pi}\\sin x\\,dx', '2'],
    ['\\int _{-1}^1\\left|x\\right|dx', '1'],
    ['\\int _1^0x\\,dx', '-\\frac{1}{2}'],
    ['\\int _2^2x\\,dx', '0'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('symbolic limits give an expression', () => {
    expect(simplifyLatex('\\int _0^xt\\,dt')).toBe('\\frac{x^{2}}{2}');
  });

  test('improper integrals use exact limits at ±∞ and at undefined endpoints', () => {
    expect(simplifyLatex('\\int _0^{\\infty}e^{-x}dx')).toBe('1');
    expect(simplifyLatex('\\int _0^{\\infty}xe^{-x}dx')).toBe('1');
    expect(simplifyLatex('\\int _{-\\infty}^{\\infty}\\frac{1}{1+x^{2}}dx')).toBe('\\pi');
    expect(simplifyLatex('\\int _1^{\\infty}\\frac{1}{x\\left(x+1\\right)}dx')).toBe('\\ln\\left(2\\right)');
    expect(simplifyLatex('\\int _0^1\\ln x\\,dx')).toBe('-1');
    expect(simplifyLatex('\\int _0^1\\frac{1}{\\sqrt{x}}dx')).toBe('2');
  });

  test('divergent integrals are errors, even where F(b) - F(a) would give a number', () => {
    expect(() => simplifyLatex('\\int _{-1}^1\\frac{1}{x^{2}}dx')).toThrow('diverges');
    expect(() => simplifyLatex('\\int _1^{\\infty}\\frac{1}{x}dx')).toThrow('diverges');
    expect(() => simplifyLatex('\\int _0^2\\tan x\\,dx')).toThrow('diverges');
  });

  test('without an antiderivative the value is approximate in both modes', () => {
    expect(calculate('\\int _0^1e^{x^{2}}dx')).toEqual({
      kind: 'value',
      result: { exact: '\\approx 1.46265174591', decimal: '\\approx 1.46265174591' },
    });
  });

  test('degree mode integrates trig in degrees', () => {
    expect(calculate('\\int _0^{90}\\cos x\\,dx', { angleMode: 'degrees' })).toMatchObject({ result: { exact: '=\\frac{180}{\\pi}' } });
  });
});
