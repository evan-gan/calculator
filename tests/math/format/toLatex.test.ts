import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('LaTeX printing', () => {
  test('constant sums with a shared denominator use one fraction bar', () => {
    expect(simplifyLatex('\\frac{\\sqrt{6}}{4}-\\frac{\\sqrt{2}}{4}')).toBe('\\frac{\\sqrt{6}-\\sqrt{2}}{4}');
  });

  test('negative terms print with a minus sign', () => {
    expect(simplifyLatex('x-2y')).toBe('x-2 y');
  });

  test('negative exponents print as fractions', () => {
    expect(simplifyLatex('x^{-2}')).toBe('\\frac{1}{x^{2}}');
    expect(simplifyLatex('\\frac{3}{x+1}')).toBe('\\frac{3}{x+1}');
  });

  test('adjacent numbers get a \\cdot so they do not run together', () => {
    expect(simplifyLatex('3\\cdot2^{x}')).toBe('3\\cdot 2^{x}');
  });

  test('roots with exponents and logs with bases', () => {
    expect(simplifyLatex('\\sqrt[3]{4}')).toBe('\\sqrt[3]{4}');
    expect(simplifyLatex('\\log_{5}x')).toBe('\\log_{5}\\left(x\\right)');
    expect(simplifyLatex('\\log x')).toBe('\\log\\left(x\\right)');
  });

  test('powers of trig functions use the sin² notation', () => {
    expect(simplifyLatex('\\sin\\left(x\\right)^{2}')).toBe('\\sin^{2}\\left(x\\right)');
  });
});

describe('shared symbolic denominators', () => {
  test('terms sharing 1/e print over a single denominator', () => {
    expect(simplifyLatex('\\frac{4}{e}+\\frac{\\sqrt{2}}{2e}+\\frac{2\\sqrt{6}}{e}')).toBe('\\frac{8+\\sqrt{2}+4 \\sqrt{6}}{2 e}');
  });

  test('variable terms sharing 1/x combine', () => {
    expect(simplifyLatex('\\frac{1}{x}+\\frac{y}{x}')).toBe('\\frac{y+1}{x}');
  });
});
