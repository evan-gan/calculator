import { describe, expect, test } from 'vitest';
import { calculate, evaluateWorkspace } from '../../../../src/math';
import { simplifyLatex } from '../../../helpers';

describe('lim on screen', () => {
  test('exact values in both display modes', () => {
    expect(calculate('\\lim_{x\\to0}\\frac{\\sin x}{x}')).toEqual({ kind: 'value', result: { exact: '=1', decimal: '=1', scientific: '=1\\times10^{0}' } });
    expect(calculate('\\lim_{x\\to\\infty}\\arctan x')).toEqual({ kind: 'value', result: { exact: '=\\frac{\\pi}{2}', decimal: '\\approx 1.57079632679', scientific: '\\approx 1.57079632679\\times10^{0}' } });
  });

  test('infinite limits show ∞ in both modes', () => {
    expect(calculate('\\lim_{x\\to0^{+}}\\frac{1}{x}')).toEqual({ kind: 'value', result: { exact: '=\\infty', decimal: '=\\infty', scientific: '=\\infty' } });
    expect(simplifyLatex('\\lim_{x\\to0^{-}}\\frac{1}{x}')).toBe('-\\infty');
    expect(simplifyLatex('\\lim_{x\\to0}\\frac{1}{x^{2}}')).toBe('\\infty');
  });

  test('sides that disagree mean there is no limit', () => {
    expect(calculate('\\lim_{x\\to0}\\frac{1}{x}')).toEqual({
      kind: 'error',
      message: "This limit doesn't exist: it approaches -∞ from the left but ∞ from the right.",
      category: 'invalid',
    });
    expect(calculate('\\lim_{x\\to0}\\frac{\\left|x\\right|}{x}')).toMatchObject({ message: "This limit doesn't exist: it approaches -1 from the left but 1 from the right." });
  });

  test('oscillation means there is no limit', () => {
    expect(calculate('\\lim_{x\\to0}\\sin\\left(\\frac{1}{x}\\right)')).toMatchObject({ message: "This limit doesn't exist: the expression keeps oscillating." });
    expect(calculate('\\lim_{x\\to\\infty}\\sin x')).toMatchObject({ message: "This limit doesn't exist: the expression keeps oscillating." });
  });

  test('a two-sided limit uses the only side where the expression is defined', () => {
    expect(simplifyLatex('\\lim_{x\\to0}\\sqrt{x}')).toBe('0');
    expect(calculate('\\lim_{x\\to0^{-}}\\sqrt{x}')).toMatchObject({ message: "This limit doesn't exist: the expression isn't defined next to that point." });
  });

  test('other variables stay symbolic: the derivative from its definition', () => {
    expect(simplifyLatex('\\lim_{h\\to0}\\frac{\\left(x+h\\right)^{2}-x^{2}}{h}')).toBe('2 x');
    expect(simplifyLatex('\\lim_{h\\to0}\\frac{\\sin\\left(x+h\\right)-\\sin x}{h}')).toBe('\\cos\\left(x\\right)');
  });

  test('limits without an exact value are approximated', () => {
    expect(calculate('\\lim_{x\\to0}\\frac{\\left|\\sin x\\right|}{\\left|x\\right|}')).toMatchObject({ result: { exact: '\\approx 1' } });
  });

  test('unevaluated limits with other variables print as lim', () => {
    expect(simplifyLatex('\\lim_{x\\to\\infty}x\\sin\\left(ax\\right)')).toBe('\\lim_{x\\to \\infty}x \\sin\\left(a x\\right)');
  });

  test('degree mode applies inside the limit', () => {
    expect(calculate('\\lim_{x\\to0}\\frac{\\sin x}{x}', { angleMode: 'degrees' })).toMatchObject({ result: { exact: '=\\frac{\\pi}{180}' } });
  });

  test('equations and other lines can use limits', () => {
    expect(calculate('\\lim_{x\\to0}\\frac{\\sin\\left(ax\\right)}{x}=3')).toEqual({ kind: 'solved', solutions: { exactLines: ['a=3'], decimalLines: ['a=3'], scientificLines: ['a=3\\times10^{0}'], notes: [] } });
    const [, squared, atA] = evaluateWorkspace(['L=\\lim_{x\\to0}\\frac{\\sin\\left(3x\\right)}{x}', 'L^{2}', '\\lim_{x\\to a}x^{3}', 'a=2']);
    expect(squared.result).toEqual({ kind: 'value', result: { exact: '=9', decimal: '=9', scientific: '=9\\times10^{0}' } });
    expect(atA.result).toEqual({ kind: 'value', result: { exact: '=8', decimal: '=8', scientific: '=8\\times10^{0}' } });
  });
});
