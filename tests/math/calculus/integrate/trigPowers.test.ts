import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('powers and products of trig functions', () => {
  test('odd powers substitute w = sin x or w = cos x', () => {
    expect(simplifyLatex('\\int\\cos^{3}x\\,dx')).toBe('-\\frac{\\sin^{3}\\left(x\\right)}{3}+\\sin\\left(x\\right)');
    expect(simplifyLatex('\\int\\sin^{3}x\\cos^{2}x\\,dx')).toBe('\\frac{\\cos^{5}\\left(x\\right)}{5}-\\frac{\\cos^{3}\\left(x\\right)}{3}');
    expect(simplifyLatex('\\int\\frac{\\sin x}{\\cos^{3}x}dx')).toBe('\\frac{1}{2 \\cos^{2}\\left(x\\right)}');
  });

  test('even powers use the reduction formula, with a linear argument', () => {
    expect(simplifyLatex('\\int\\sin^{4}x\\,dx')).toBe(
      '-\\frac{\\cos\\left(x\\right) \\sin^{3}\\left(x\\right)}{4}-\\frac{3 \\cos\\left(x\\right) \\sin\\left(x\\right)}{8}+\\frac{3 x}{8}',
    );
    expect(simplifyLatex('\\int\\cos^{4}\\left(2x\\right)dx')).toBe(
      '\\frac{\\cos^{3}\\left(2 x\\right) \\sin\\left(2 x\\right)}{8}+\\frac{3 \\cos\\left(2 x\\right) \\sin\\left(2 x\\right)}{16}+\\frac{3 x}{8}',
    );
  });

  test('tan, cot, sec and csc powers', () => {
    expect(simplifyLatex('\\int\\tan^{3}x\\,dx')).toBe('\\frac{\\tan^{2}\\left(x\\right)}{2}+\\ln\\left|\\cos\\left(x\\right)\\right|');
    expect(simplifyLatex('\\int\\sec^{3}x\\,dx')).toBe(
      '\\frac{\\sec\\left(x\\right) \\tan\\left(x\\right)}{2}+\\frac{\\ln\\left|\\sec\\left(x\\right)+\\tan\\left(x\\right)\\right|}{2}',
    );
    expect(simplifyLatex('\\int\\cot^{3}x\\,dx')).toBe('-\\frac{\\cot^{2}\\left(x\\right)}{2}-\\ln\\left|\\sin\\left(x\\right)\\right|');
  });

  test('sin/cos quotients that are one reciprocal function', () => {
    expect(simplifyLatex('\\int\\frac{1}{\\cos^{4}x}dx')).toBe('\\frac{\\sec^{2}\\left(x\\right) \\tan\\left(x\\right)}{3}+\\frac{2 \\tan\\left(x\\right)}{3}');
    expect(simplifyLatex('\\int\\frac{\\sin^{2}x}{\\cos^{2}x}dx')).toBe('-x+\\tan\\left(x\\right)');
  });

  test('definite integrals of trig powers are exact', () => {
    expect(simplifyLatex('\\int_0^{\\pi}\\sin^{5}x\\,dx')).toBe('\\frac{16}{15}');
  });
});
