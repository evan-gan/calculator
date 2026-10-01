import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('integrating rational functions', () => {
  test('polynomial division then logarithms', () => {
    expect(simplifyLatex('\\int \\frac{x^{3}+1}{x^{2}+x}dx')).toBe('\\frac{x^{2}}{2}-x+\\ln\\left|x\\right|');
  });

  test('distinct linear factors', () => {
    expect(simplifyLatex('\\int \\frac{1}{x^{2}-1}dx')).toBe('\\frac{\\ln\\left|x-1\\right|}{2}-\\frac{\\ln\\left|x+1\\right|}{2}');
  });

  test('repeated factors give a power term', () => {
    expect(simplifyLatex('\\int \\frac{1}{\\left(x-1\\right)^{2}\\left(x+2\\right)}dx')).toBe(
      '-\\frac{\\ln\\left|x-1\\right|}{9}+\\frac{\\ln\\left|x+2\\right|}{9}-\\frac{1}{3 \\left(x-1\\right)}',
    );
  });

  test('irreducible quadratics give arctan and a log without bars', () => {
    expect(simplifyLatex('\\int \\frac{1}{x^{2}+1}dx')).toBe('\\tan^{-1}\\left(x\\right)');
    expect(simplifyLatex('\\int \\frac{1}{x^{3}+x}dx')).toBe('-\\frac{\\ln\\left(x^{2}+1\\right)}{2}+\\ln\\left|x\\right|');
    expect(simplifyLatex('\\int \\frac{2x+3}{x^{2}+2x+5}dx')).toBe(
      '\\frac{\\tan^{-1}\\left(\\frac{x}{2}+\\frac{1}{2}\\right)}{2}+\\ln\\left(x^{2}+2 x+5\\right)',
    );
  });

  test('quadratics with irrational roots', () => {
    expect(simplifyLatex('\\int \\frac{1}{x^{2}-2}dx')).toBe(
      '\\frac{\\sqrt{2} \\ln\\left|x-\\sqrt{2}\\right|}{4}-\\frac{\\sqrt{2} \\ln\\left|x+\\sqrt{2}\\right|}{4}',
    );
  });

  test('quartics that split into quadratics with irrational coefficients', () => {
    expect(simplifyLatex('\\int \\frac{1}{x^{4}+1}dx')).toBe(
      '\\frac{\\sqrt{2} \\tan^{-1}\\left(\\sqrt{2} x-1\\right)}{4}+\\frac{\\sqrt{2} \\tan^{-1}\\left(\\sqrt{2} x+1\\right)}{4}' +
        '-\\frac{\\sqrt{2} \\ln\\left(x^{2}-\\sqrt{2} x+1\\right)}{8}+\\frac{\\sqrt{2} \\ln\\left(x^{2}+\\sqrt{2} x+1\\right)}{8}',
    );
    // Ferrari's method with a rational resolvent root, and x⁴ + x² + 1 = (x² + x + 1)(x² - x + 1).
    expect(simplifyLatex('\\int \\frac{1}{x^{4}+4}dx')).toBe(
      '\\frac{\\tan^{-1}\\left(x-1\\right)}{8}+\\frac{\\tan^{-1}\\left(x+1\\right)}{8}-\\frac{\\ln\\left(x^{2}-2 x+2\\right)}{16}+\\frac{\\ln\\left(x^{2}+2 x+2\\right)}{16}',
    );
    expect(simplifyLatex('\\int \\frac{1}{x^{4}+x^{2}+1}dx')).toContain('\\ln\\left(x^{2}+x+1\\right)');
  });

  test('pure cubics split with a cube root: x³ + 1 and x³ + 2', () => {
    expect(simplifyLatex('\\int \\frac{1}{x^{3}+1}dx')).toBe(
      '\\frac{\\sqrt{3} \\tan^{-1}\\left(\\frac{2 \\sqrt{3} x}{3}-\\frac{\\sqrt{3}}{3}\\right)}{3}-\\frac{\\ln\\left(x^{2}-x+1\\right)}{6}+\\frac{\\ln\\left|x+1\\right|}{3}',
    );
    expect(simplifyLatex('\\int \\frac{1}{x^{3}+2}dx')).toContain('\\ln\\left|x+\\sqrt[3]{2}\\right|');
  });

  test('repeated quadratic factors use the reduction formula', () => {
    expect(simplifyLatex('\\int \\frac{1}{\\left(x^{2}+1\\right)^{2}}dx')).toBe('\\frac{\\tan^{-1}\\left(x\\right)}{2}+\\frac{x}{2 \\left(x^{2}+1\\right)}');
    expect(simplifyLatex('\\int \\frac{x^{3}}{\\left(x^{2}+1\\right)^{2}}dx')).toBe(
      '\\frac{\\ln\\left(x^{2}+1\\right)}{2}+\\frac{1}{2 \\left(x^{2}+1\\right)}',
    );
  });

  test('definite integrals over irrational factors are exact', () => {
    expect(simplifyLatex('\\int_0^{\\infty}\\frac{1}{x^{4}+1}dx')).toBe('\\frac{\\sqrt{2} \\pi}{4}');
  });

  test('denominators that only split with nested or general radicals are not handled', () => {
    expect(() => simplifyLatex('\\int \\frac{1}{x^{4}+x+1}dx')).toThrow("Couldn't find");
  });
});
