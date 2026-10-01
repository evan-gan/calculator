import { describe, expect, test } from 'vitest';
import { INFINITY } from '../../../../src/math/ast/calculus';
import { num } from '../../../../src/math/ast/nodes';
import { rationalFunctionLimit } from '../../../../src/math/calculus/limit/rationalLimit';
import type { Approach } from '../../../../src/math/calculus/limit/types';
import { toLatex } from '../../../../src/math/format/toLatex';
import { simplify } from '../../../../src/math/simplify/simplify';
import { parseExpr } from '../../../helpers';

function limitOf(latex: string, approach: Omit<Approach, 'variable'>): string | null {
  const result = rationalFunctionLimit(simplify(parseExpr(latex)), { variable: 'x', ...approach });
  if (!result) return null;
  if (result.kind === 'finite') return toLatex(result.value);
  return result.kind === 'infinite' ? (result.sign === 1 ? '∞' : '-∞') : result.kind;
}

describe('limits of rational functions', () => {
  test('common factors cancel before substituting: (x² - 1)/(x - 1) → 2 at 1', () => {
    expect(limitOf('\\frac{x^{2}-1}{x-1}', { point: num(1), direction: 1 })).toBe('2');
  });

  test('at a pole the side and the multiplicity give the sign', () => {
    expect(limitOf('\\frac{1}{x-2}', { point: num(2), direction: 1 })).toBe('∞');
    expect(limitOf('\\frac{1}{x-2}', { point: num(2), direction: -1 })).toBe('-∞');
    expect(limitOf('\\frac{-1}{\\left(x-2\\right)^{2}}', { point: num(2), direction: -1 })).toBe('-∞');
  });

  test('at ±∞ the degrees decide', () => {
    expect(limitOf('\\frac{3x^{2}+1}{2x^{2}-x}', { point: null, direction: 1 })).toBe('\\frac{3}{2}');
    expect(limitOf('\\frac{x}{x^{2}+1}', { point: null, direction: 1 })).toBe('0');
    expect(limitOf('\\frac{x^{3}}{x+1}', { point: null, direction: -1 })).toBe('∞');
    expect(limitOf('x^{3}', { point: null, direction: -1 })).toBe('-∞');
  });

  test('anything that is not a rational function is left to the other rules', () => {
    expect(limitOf('\\frac{\\sin x}{x}', { point: num(0), direction: 1 })).toBeNull();
    expect(limitOf('\\sqrt{x}', { point: INFINITY, direction: 1 })).toBeNull();
  });
});
