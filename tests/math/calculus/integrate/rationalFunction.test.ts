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
    expect(simplifyLatex('\\int \\frac{1}{x^{2}+1}dx')).toBe('\\arctan\\left(x\\right)');
    expect(simplifyLatex('\\int \\frac{1}{x^{3}+x}dx')).toBe('-\\frac{\\ln\\left(x^{2}+1\\right)}{2}+\\ln\\left|x\\right|');
    expect(simplifyLatex('\\int \\frac{2x+3}{x^{2}+2x+5}dx')).toBe(
      '\\frac{\\arctan\\left(\\frac{x}{2}+\\frac{1}{2}\\right)}{2}+\\ln\\left(x^{2}+2 x+5\\right)',
    );
  });

  test('quadratics with irrational roots', () => {
    expect(simplifyLatex('\\int \\frac{1}{x^{2}-2}dx')).toBe(
      '\\frac{\\sqrt{2} \\ln\\left|x-\\sqrt{2}\\right|}{4}-\\frac{\\sqrt{2} \\ln\\left|x+\\sqrt{2}\\right|}{4}',
    );
  });

  test('denominators with a quartic factor are not handled yet', () => {
    expect(() => simplifyLatex('\\int \\frac{1}{x^{4}+1}dx')).toThrow("Couldn't find");
  });
});
