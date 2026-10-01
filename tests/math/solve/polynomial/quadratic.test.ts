import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('quadratic equations', () => {
  test.each([
    ['x^{2}-5x+6=0', 'x=2,\\ 3'],
    ['x^{2}=2', 'x=\\pm \\sqrt{2}'],
    ['x^{2}-2x+1=0', 'x=1'],
    ['2x^{2}+3x-2=0', 'x=-2,\\ \\frac{1}{2}'],
    ['x^{2}=\\pi', 'x=\\pm \\sqrt{\\pi}'],
    ['\\left(x-1\\right)^{2}=4', 'x=-1,\\ 3'],
  ])('%s gives %s', (equation, expected) => {
    expect(solveLatex(equation).exactLines).toEqual([expected]);
  });

  test('negative discriminant means no real solution', () => {
    expect(solveLatex('x^{2}+1=0').notes).toEqual(['No real solution.']);
  });
});
