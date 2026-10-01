import { describe, expect, test } from 'vitest';
import { calculate } from '../../../../src/math';
import { simplifyLatex } from '../../../helpers';

describe('infinite sums', () => {
  test('geometric series', () => {
    expect(simplifyLatex('\\sum _{n=0}^{\\infty}\\frac{1}{2^{n}}')).toBe('2');
    expect(simplifyLatex('\\sum _{n=1}^{\\infty}\\left(-\\frac{1}{3}\\right)^{n}')).toBe('-\\frac{1}{4}');
  });

  test('even p-series are multiples of powers of π', () => {
    expect(simplifyLatex('\\sum _{n=1}^{\\infty}\\frac{1}{n^{2}}')).toBe('\\frac{\\pi^{2}}{6}');
    expect(simplifyLatex('\\sum _{n=1}^{\\infty}\\frac{1}{n^{4}}')).toBe('\\frac{\\pi^{4}}{90}');
    expect(simplifyLatex('\\sum _{n=2}^{\\infty}\\frac{1}{n^{2}}')).toBe('\\frac{\\pi^{2}-6}{6}');
  });

  test('exponential series', () => {
    expect(simplifyLatex('\\sum _{n=0}^{\\infty}\\frac{1}{n!}')).toBe('e');
    expect(simplifyLatex('\\sum _{n=0}^{\\infty}\\frac{x^{n}}{n!}')).toBe('e^{x}');
    expect(simplifyLatex('\\sum _{n=1}^{\\infty}\\frac{1}{n!}')).toBe('e-1');
  });

  test('divergent series are errors', () => {
    expect(() => simplifyLatex('\\sum _{n=1}^{\\infty}\\frac{1}{n}')).toThrow('diverges');
    expect(() => simplifyLatex('\\sum _{n=1}^{\\infty}2^{n}')).toThrow('diverges');
    expect(() => simplifyLatex('\\sum _{n=1}^{\\infty}5')).toThrow('diverges');
    expect(() => simplifyLatex('\\sum _{n=1}^{\\infty}\\sqrt{n}')).toThrow('diverges');
  });

  test('convergent series without a formula are shown approximately', () => {
    expect(calculate('\\sum _{n=1}^{\\infty}\\frac{1}{n^{3}}')).toEqual({
      kind: 'value',
      result: { exact: '\\approx 1.20205690316', decimal: '\\approx 1.20205690316' },
    });
    expect(calculate('\\sum _{n=1}^{\\infty}\\frac{\\left(-1\\right)^{n+1}}{n}')).toMatchObject({ result: { decimal: '\\approx 0.69314718056' } });
  });
});
