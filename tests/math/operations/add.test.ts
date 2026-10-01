import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('sum simplification', () => {
  test.each([
    ['0.1+0.2', '\\frac{3}{10}'],
    ['\\frac{1}{2}+\\frac{1}{3}+\\frac{1}{6}', '1'],
    ['2x+3x', '5 x'],
    ['2\\sqrt{2}+3\\sqrt{2}', '5 \\sqrt{2}'],
    ['x+1-x', '1'],
    ['\\pi+\\pi', '2 \\pi'],
    ['x^{2}+x+x^{2}+1', '2 x^{2}+x+1'],
    ['\\sin\\left(x\\right)-\\sin\\left(x\\right)', '0'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });
});
