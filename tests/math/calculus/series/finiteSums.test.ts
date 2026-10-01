import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('finite sums and products', () => {
  test('numeric limits give exact totals', () => {
    expect(simplifyLatex('\\sum _{n=1}^{10}n')).toBe('55');
    expect(simplifyLatex('\\sum _{n=1}^{10}\\frac{1}{2^{n}}')).toBe('\\frac{1023}{1024}');
    expect(simplifyLatex('\\sum _{n=1}^{4}\\frac{1}{n}')).toBe('\\frac{25}{12}');
  });

  test('polynomial terms up to a symbolic limit use Faulhaber’s formula', () => {
    expect(simplifyLatex('\\sum _{k=1}^{n}k')).toBe('\\frac{n^{2}}{2}+\\frac{n}{2}');
    expect(simplifyLatex('\\sum _{n=1}^{k}n^{2}')).toBe('\\frac{k^{3}}{3}+\\frac{k^{2}}{2}+\\frac{k}{6}');
  });

  test('short sums with other variables are written out', () => {
    expect(simplifyLatex('\\sum _{n=1}^{3}x^{n}')).toBe('x^{3}+x^{2}+x');
  });

  test('an empty range sums to 0 and multiplies to 1', () => {
    expect(simplifyLatex('\\sum _{n=5}^{1}n')).toBe('0');
    expect(simplifyLatex('\\prod _{n=5}^{1}n')).toBe('1');
  });

  test('products', () => {
    expect(simplifyLatex('\\prod _{n=1}^{5}n')).toBe('120');
    expect(simplifyLatex('\\prod _{n=1}^{4}2')).toBe('16');
    expect(simplifyLatex('\\prod _{n=1}^{3}\\left(n+x\\right)')).toBe('\\left(x+1\\right) \\left(x+2\\right) \\left(x+3\\right)');
  });

  test('limits must be whole numbers', () => {
    expect(() => simplifyLatex('\\sum _{n=1}^{2.5}n')).toThrow('whole numbers');
    expect(() => simplifyLatex('\\sum _{n=1}^{-\\infty}n')).toThrow('-∞');
  });
});
