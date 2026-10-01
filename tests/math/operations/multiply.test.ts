import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('product simplification', () => {
  test.each([
    ['x\\cdot x^{2}', 'x^{3}'],
    ['\\sqrt{8}\\sqrt{2}', '4'],
    ['\\sqrt{2}\\sqrt{3}', '\\sqrt{6}'],
    ['\\frac{x}{x}', '1'],
    ['2\\left(x+1\\right)', '2 x+2'],
    ['\\left(1+\\sqrt{2}\\right)\\left(1-\\sqrt{2}\\right)', '-1'],
    ['\\frac{x}{2}\\cdot\\frac{4}{x^{2}}', '\\frac{2}{x}'],
    ['0\\cdot\\sin\\left(x\\right)', '0'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('products of variable sums stay factored for display', () => {
    expect(simplifyLatex('x\\left(x+1\\right)')).toBe('x \\left(x+1\\right)');
  });
});
