import { describe, expect, test } from 'vitest';
import { limitAtInfinity, limitAtPoint } from '../../../src/math/calculus/antiderivativeLimits';
import { num } from '../../../src/math/ast/nodes';
import { toLatex } from '../../../src/math/format/toLatex';
import { simplify } from '../../../src/math/simplify/simplify';
import { parseExpr } from '../../helpers';

const atInfinity = (latex: string, direction: 1 | -1) => {
  const limit = limitAtInfinity(simplify(parseExpr(latex)), 'x', direction);
  return limit && toLatex(limit);
};

describe('limits of antiderivatives', () => {
  test('vanishing terms drop out and constants stay', () => {
    expect(atInfinity('3-e^{-x}', 1)).toBe('3');
  });

  test('arctan approaches ±π/2', () => {
    expect(atInfinity('\\arctan\\left(x\\right)', 1)).toBe('\\frac{\\pi}{2}');
    expect(atInfinity('\\arctan\\left(-2x\\right)', -1)).toBe('\\frac{\\pi}{2}');
  });

  test('logarithms whose growth cancels', () => {
    expect(atInfinity('\\ln\\left|x\\right|-\\ln\\left|x+1\\right|', 1)).toBe('0');
    expect(atInfinity('\\ln\\left|2x\\right|-\\ln\\left|x+1\\right|', 1)).toBe('\\ln\\left(2\\right)');
  });

  test('growing terms have no limit', () => {
    expect(atInfinity('x', 1)).toBeNull();
    expect(atInfinity('\\ln\\left|x\\right|', 1)).toBeNull();
  });

  test('one-sided limit where a term is undefined at the point', () => {
    const limit = limitAtPoint(simplify(parseExpr('x\\ln\\left(x\\right)-x')), 'x', num(0), 1);
    expect(limit && toLatex(limit)).toBe('0');
    expect(limitAtPoint(simplify(parseExpr('\\ln\\left(x\\right)')), 'x', num(0), 1)).toBeNull();
  });
});
