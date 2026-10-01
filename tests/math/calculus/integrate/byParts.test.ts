import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('integration by parts', () => {
  test('polynomial times exponential or trig', () => {
    expect(simplifyLatex('\\int xe^{x}dx')).toBe('e^{x} x-e^{x}');
    expect(simplifyLatex('\\int x^{2}\\sin x\\,dx')).toBe('-x^{2} \\cos\\left(x\\right)+2 x \\sin\\left(x\\right)+2 \\cos\\left(x\\right)');
  });

  test('logarithms and inverse trig are differentiated instead', () => {
    expect(simplifyLatex('\\int x\\ln x\\,dx')).toBe('\\frac{x^{2} \\ln\\left(x\\right)}{2}-\\frac{x^{2}}{4}');
    expect(simplifyLatex('\\int \\arctan x\\,dx')).toBe('x \\arctan\\left(x\\right)-\\frac{\\ln\\left(x^{2}+1\\right)}{2}');
  });
});
