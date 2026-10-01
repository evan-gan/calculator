import { describe, expect, test } from 'vitest';
import { limitFromGrowth } from '../../../../src/math/calculus/limit/growth';
import { toLatex } from '../../../../src/math/format/toLatex';
import { simplify } from '../../../../src/math/simplify/simplify';
import { parseExpr } from '../../../helpers';

function growthLimit(latex: string, direction: 1 | -1): string | null {
  const result = limitFromGrowth(simplify(parseExpr(latex)), 'x', direction);
  if (!result) return null;
  if (result.kind === 'finite') return toLatex(result.value);
  return result.kind === 'infinite' ? (result.sign === 1 ? '∞' : '-∞') : result.kind;
}

describe('leading terms of algebraic expressions at ±∞', () => {
  test('square roots of polynomials grow like |x|^(degree/2)', () => {
    expect(growthLimit('\\frac{\\sqrt{4x^{2}+1}}{x}', 1)).toBe('2');
    expect(growthLimit('\\frac{x}{\\sqrt{x^{2}+1}}', -1)).toBe('-1');
  });

  test('sums keep their largest power', () => {
    expect(growthLimit('\\frac{x}{\\sqrt{x^{2}+x}+x}', 1)).toBe('\\frac{1}{2}');
    expect(growthLimit('\\sqrt{x}-x', 1)).toBe('-∞');
  });

  test('cancelling leading terms need the next order, so no answer is given', () => {
    expect(growthLimit('\\sqrt{x^{2}+x}-x', 1)).toBeNull();
  });

  test('non-algebraic parts are not handled', () => {
    expect(growthLimit('x\\sin x', 1)).toBeNull();
  });
});
