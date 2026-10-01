import { describe, expect, test } from 'vitest';
import { calculate } from '../../../../src/math';
import { simplifyLatex } from '../../../helpers';

describe('telescoping sums of rational functions', () => {
  test('Σ 1/(n(n+1)) is exactly 1, not ≈ 1', () => {
    expect(calculate('\\sum_{n=1}^{\\infty}\\frac{1}{n\\left(n+1\\right)}')).toEqual({ kind: 'value', result: { exact: '=1', decimal: '=1' } });
  });

  test('finite sums with a symbolic or large upper limit', () => {
    expect(simplifyLatex('\\sum_{n=1}^{N}\\frac{1}{n\\left(n+1\\right)}')).toBe('-\\frac{1}{N+1}+1');
    expect(simplifyLatex('\\sum_{n=1}^{1000}\\frac{1}{n\\left(n+1\\right)}')).toBe('\\frac{1000}{1001}');
  });

  test('gaps of more than one and several factors', () => {
    expect(simplifyLatex('\\sum_{n=1}^{\\infty}\\frac{1}{n\\left(n+2\\right)}')).toBe('\\frac{3}{4}');
    expect(simplifyLatex('\\sum_{n=1}^{\\infty}\\frac{1}{n\\left(n+1\\right)\\left(n+2\\right)}')).toBe('\\frac{1}{4}');
    expect(simplifyLatex('\\sum_{n=2}^{\\infty}\\frac{1}{n^{2}-1}')).toBe('\\frac{3}{4}');
  });

  test('roots at fractions: Σ 1/((2n+1)(2n+3)) = 1/2', () => {
    expect(simplifyLatex('\\sum_{n=0}^{\\infty}\\frac{1}{\\left(2n+1\\right)\\left(2n+3\\right)}')).toBe('\\frac{1}{2}');
  });

  test('squared factors leave a ζ(2) part: Σ 1/(n²(n+1)²) = π²/3 - 3', () => {
    expect(simplifyLatex('\\sum_{n=1}^{\\infty}\\frac{1}{n^{2}\\left(n+1\\right)^{2}}')).toBe('\\frac{\\pi^{2}-9}{3}');
  });

  test('terms that shrink like 1/n diverge', () => {
    expect(calculate('\\sum_{n=1}^{\\infty}\\frac{1}{n+1}')).toEqual({
      kind: 'error',
      message: 'This series diverges, so it has no value. (Its terms shrink like 1/n.)',
    });
  });

  test('a term that divides by zero inside the range is an error', () => {
    expect(calculate('\\sum_{n=0}^{\\infty}\\frac{1}{n\\left(n+1\\right)}')).toEqual({ kind: 'error', message: 'This sum divides by zero at n = 0.' });
  });

  test('non-telescoping rational terms stay numeric', () => {
    expect(calculate('\\sum_{n=1}^{\\infty}\\frac{1}{n^{2}+1}')).toMatchObject({ result: { exact: '\\approx 1.07667404747' } });
  });
});
