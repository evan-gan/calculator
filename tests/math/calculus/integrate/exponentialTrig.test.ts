import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('exponential times sine or cosine', () => {
  test('∫ eˣ sin x and ∫ eˣ cos x', () => {
    expect(simplifyLatex('\\int e^{x}\\sin x\\,dx')).toBe('\\frac{e^{x} \\left(-\\cos\\left(x\\right)+\\sin\\left(x\\right)\\right)}{2}');
    expect(simplifyLatex('\\int e^{x}\\cos x\\,dx')).toBe('\\frac{e^{x} \\left(\\cos\\left(x\\right)+\\sin\\left(x\\right)\\right)}{2}');
  });

  test('scaled arguments and other bases', () => {
    expect(simplifyLatex('\\int e^{2x}\\sin\\left(3x\\right)dx')).toBe(
      '\\frac{e^{2 x} \\left(-3 \\cos\\left(3 x\\right)+2 \\sin\\left(3 x\\right)\\right)}{13}',
    );
    expect(simplifyLatex('\\int 2^{x}\\cos x\\,dx')).toContain('\\ln\\left(2\\right)^{2}');
  });

  test('improper integrals of decaying waves', () => {
    expect(simplifyLatex('\\int_0^{\\infty}e^{-x}\\sin x\\,dx')).toBe('\\frac{1}{2}');
  });

  test('a polynomial in front goes through integration by parts', () => {
    expect(simplifyLatex('\\int xe^{x}\\sin x\\,dx')).toContain('\\frac{e^{x} x \\left(-\\cos\\left(x\\right)+\\sin\\left(x\\right)\\right)}{2}');
  });
});
