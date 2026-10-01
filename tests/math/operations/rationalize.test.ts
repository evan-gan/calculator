import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('rationalizing denominators and denesting roots', () => {
  test.each([
    ['\\frac{1}{2+\\sqrt{3}}', '2-\\sqrt{3}'],
    ['\\frac{1}{\\sqrt{3}-\\sqrt{2}}', '\\sqrt{2}+\\sqrt{3}'],
    ['\\frac{\\sqrt{6}-\\sqrt{2}}{\\sqrt{6}+\\sqrt{2}}', '2-\\sqrt{3}'],
    ['\\sqrt{3+2\\sqrt{2}}', '1+\\sqrt{2}'],
    ['\\sqrt{3-2\\sqrt{2}}', '\\sqrt{2}-1'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('roots that cannot be denested are left nested', () => {
    expect(simplifyLatex('\\sqrt{2+\\sqrt{2}}')).toBe('\\sqrt{2+\\sqrt{2}}');
  });
});
