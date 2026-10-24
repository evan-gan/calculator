import { describe, expect, test } from 'vitest';
import { calculate } from '../../../../src/math';
import { simplifyLatex } from '../../../helpers';

describe('infinite products', () => {
  test('rational factors with whole-number roots: Π (1 - 1/n²) from 2 is 1/2', () => {
    expect(simplifyLatex('\\prod_{n=2}^{\\infty}\\left(1-\\frac{1}{n^{2}}\\right)')).toBe('\\frac{1}{2}');
    expect(simplifyLatex('\\prod_{n=1}^{\\infty}\\left(1+\\frac{1}{n\\left(n+2\\right)}\\right)')).toBe('2');
  });

  test("Wallis's product gives π/2 through Γ(1/2) = √π", () => {
    expect(simplifyLatex('\\prod_{n=1}^{\\infty}\\frac{4n^{2}}{4n^{2}-1}')).toBe('\\frac{\\pi}{2}');
  });

  test('factors without rational roots that are shifts of each other: Π (n³ - 1)/(n³ + 1) = 2/3', () => {
    expect(simplifyLatex('\\prod_{n=2}^{\\infty}\\frac{n^{3}-1}{n^{3}+1}')).toBe('\\frac{2}{3}');
  });

  test('a zero factor makes the product 0', () => {
    expect(simplifyLatex('\\prod_{n=1}^{\\infty}\\left(1-\\frac{1}{n^{2}}\\right)')).toBe('0');
  });

  test('powers of a constant base add up their exponents', () => {
    expect(simplifyLatex('\\prod_{n=1}^{\\infty}e^{\\frac{1}{n^{2}}}')).toBe('e^{\\frac{\\pi^{2}}{6}}');
    expect(simplifyLatex('\\prod_{n=1}^{\\infty}2^{\\frac{1}{2^{n}}}')).toBe('2');
  });

  test('products without a closed form are approximated', () => {
    expect(calculate('\\prod_{n=1}^{\\infty}\\left(1+\\frac{1}{n^{2}}\\right)')).toMatchObject({ result: { exact: '\\approx 3.67607787727' } });
    expect(calculate('\\prod_{n=1}^{\\infty}\\cos\\left(\\frac{1}{n}\\right)')).toMatchObject({ result: { exact: '\\approx 0.388536155081' } });
  });

  test('divergent products are errors that say why', () => {
    expect(calculate('\\prod_{n=1}^{\\infty}\\left(1+\\frac{1}{n}\\right)')).toEqual({
      kind: 'error',
      message: 'This product diverges, so it has no value. (Its factors approach 1 too slowly.)',
      category: 'invalid',
    });
    expect(calculate('\\prod_{n=1}^{\\infty}2')).toMatchObject({ message: "This product diverges, so it has no value. (Its factors don't approach 1.)" });
    expect(calculate('\\prod_{n=1}^{\\infty}2^{n}')).toMatchObject({ message: 'This product diverges, so it has no value. (The sum of its exponents diverges.)' });
  });

  test('a factor that divides by zero is reported at its index', () => {
    expect(calculate('\\prod_{n=1}^{\\infty}\\frac{n}{n-1}')).toEqual({ kind: 'error', message: 'This product divides by zero at n = 1.', category: 'invalid' });
  });
});
