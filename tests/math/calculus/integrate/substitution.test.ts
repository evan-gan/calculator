import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('u-substitution', () => {
  test.each([
    ['\\int 2x\\cos\\left(x^{2}\\right)dx', '\\sin\\left(x^{2}\\right)'],
    ['\\int x\\sqrt{x^{2}+1}dx', '\\frac{\\left(x^{2}+1\\right)^{\\frac{3}{2}}}{3}'],
    ['\\int \\frac{e^{x}}{1+e^{x}}dx', '\\ln\\left|e^{x}+1\\right|'],
    ['\\int \\frac{\\ln x}{x}dx', '\\frac{\\ln\\left(x\\right)^{2}}{2}'],
    ['\\int \\sin x\\cos x\\,dx', '-\\frac{\\cos^{2}\\left(x\\right)}{2}'],
    ['\\int \\sec x\\tan x\\,dx', '\\sec\\left(x\\right)'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });
});
