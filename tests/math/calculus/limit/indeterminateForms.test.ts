import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe("indeterminate forms (L'Hôpital, common denominators, conjugates, e^(v ln u))", () => {
  test('0/0 by L\'Hôpital, repeated when needed', () => {
    expect(simplifyLatex('\\lim_{x\\to0}\\frac{\\sin x}{x}')).toBe('1');
    expect(simplifyLatex('\\lim_{x\\to0}\\frac{1-\\cos x}{x^{2}}')).toBe('\\frac{1}{2}');
    expect(simplifyLatex('\\lim_{x\\to0}\\frac{\\tan x-x}{x^{3}}')).toBe('\\frac{1}{3}');
    expect(simplifyLatex('\\lim_{x\\to0}\\frac{e^{\\sin x}-e^{x}}{x^{3}}')).toBe('-\\frac{1}{6}');
  });

  test('0·∞ is rewritten as a quotient with the simpler bottom', () => {
    expect(simplifyLatex('\\lim_{x\\to0^{+}}x\\ln x')).toBe('0');
    expect(simplifyLatex('\\lim_{n\\to\\infty}n\\sin\\left(\\frac{1}{n}\\right)')).toBe('1');
  });

  test('1^∞, 0⁰ and ∞⁰ go through e^(v ln u)', () => {
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^{x}')).toBe('e');
    expect(simplifyLatex('\\lim_{x\\to0^{+}}x^{x}')).toBe('1');
    expect(simplifyLatex('\\lim_{x\\to\\infty}x^{\\frac{1}{x}}')).toBe('1');
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\left(\\frac{x+1}{x-1}\\right)^{x}')).toBe('e^{2}');
  });

  test('∞ - ∞ over a common denominator, or by the conjugate for square roots', () => {
    expect(simplifyLatex('\\lim_{x\\to0}\\left(\\frac{1}{x}-\\frac{1}{\\sin x}\\right)')).toBe('0');
    expect(simplifyLatex('\\lim_{x\\to1}\\left(\\frac{1}{\\ln x}-\\frac{1}{x-1}\\right)')).toBe('\\frac{1}{2}');
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\left(\\sqrt{x^{2}+x}-x\\right)')).toBe('\\frac{1}{2}');
  });

  test('the growth hierarchy at ∞: exponentials beat powers, powers beat logarithms', () => {
    expect(simplifyLatex('\\lim_{x\\to\\infty}x^{100}e^{-x}')).toBe('0');
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\frac{\\ln x}{\\sqrt{x}}')).toBe('0');
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\left(x-\\ln x\\right)')).toBe('\\infty');
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\frac{2^{x}}{3^{x}}')).toBe('0');
  });

  test('a bounded factor times something going to 0 goes to 0', () => {
    expect(simplifyLatex('\\lim_{x\\to0}x\\sin\\left(\\frac{1}{x}\\right)')).toBe('0');
    expect(simplifyLatex('\\lim_{x\\to\\infty}\\frac{x+\\sin x}{x}')).toBe('1');
  });
});
