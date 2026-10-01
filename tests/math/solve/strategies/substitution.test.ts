import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('substitution u = g(x)', () => {
  test('a quadratic in sin x', () => {
    expect(solveLatex('2\\sin^{2}\\left(x\\right)+\\sin\\left(x\\right)-1=0').exactLines).toEqual([
      'x=\\frac{\\pi}{6}+2 \\pi n',
      'x=\\frac{5 \\pi}{6}+2 \\pi n',
      'x=\\frac{3 \\pi}{2}+2 \\pi n',
    ]);
  });

  test('a quadratic in e^x (e^{2x} is rewritten as (e^x)²)', () => {
    expect(solveLatex('e^{2x}-3e^{x}+2=0').exactLines).toEqual(['x=0,\\ \\ln\\left(2\\right)']);
  });
});
