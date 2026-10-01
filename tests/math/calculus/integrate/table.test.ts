import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('standard integrals (linear arguments)', () => {
  test.each([
    ['\\int x^{2}dx', '\\frac{x^{3}}{3}'],
    ['\\int \\sqrt{x}dx', '\\frac{2 x^{\\frac{3}{2}}}{3}'],
    ['\\int \\frac{1}{x}dx', '\\ln\\left|x\\right|'],
    ['\\int e^{2x}dx', '\\frac{e^{2 x}}{2}'],
    ['\\int 3^{x}dx', '\\frac{3^{x}}{\\ln\\left(3\\right)}'],
    ['\\int \\sin x\\,dx', '-\\cos\\left(x\\right)'],
    ['\\int \\tan x\\,dx', '-\\ln\\left|\\cos\\left(x\\right)\\right|'],
    ['\\int \\ln x\\,dx', 'x \\ln\\left(x\\right)-x'],
    ['\\int \\left|x\\right|dx', '\\frac{x \\left|x\\right|}{2}'],
    ['\\int dx', 'x'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('squares of trig functions use power reduction', () => {
    expect(simplifyLatex('\\int \\sin^{2}x\\,dx')).toBe('\\frac{x}{2}-\\frac{\\sin\\left(2 x\\right)}{4}');
  });

  test('inverse square roots give arcsin and logarithms', () => {
    expect(simplifyLatex('\\int \\frac{1}{\\sqrt{1-x^{2}}}dx')).toBe('\\arcsin\\left(x\\right)');
    expect(simplifyLatex('\\int \\frac{1}{\\sqrt{x^{2}+4}}dx')).toBe('\\ln\\left|x+\\sqrt{x^{2}+4}\\right|');
  });

  test('sums and constant factors are split off', () => {
    expect(simplifyLatex('\\int x+1dx')).toBe('\\frac{x^{2}}{2}+x');
    expect(simplifyLatex('\\int \\pi\\cos x\\,dx')).toBe('\\pi \\sin\\left(x\\right)');
  });

  test('unsupported integrands explain that no antiderivative was found', () => {
    expect(() => simplifyLatex('\\int e^{x}\\sin x\\,dx')).toThrow("Couldn't find an exact antiderivative");
  });
});
