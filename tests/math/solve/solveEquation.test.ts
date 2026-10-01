import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../helpers';

describe('solveEquation outcomes', () => {
  test('an equation true for every x', () => {
    expect(solveLatex('x+1=x+1').notes).toEqual(['Every real number is a solution for x.']);
  });

  test('a contradiction has no solution', () => {
    expect(solveLatex('x+1=x+2').notes).toEqual(['No real solution.']);
  });

  test('identities the simplifier cannot see are detected numerically', () => {
    expect(solveLatex('\\sin\\left(x\\right)^{2}+\\cos\\left(x\\right)^{2}=1').notes).toEqual([
      'Every real number is a solution for x.',
    ]);
  });

  test('repeated roots are listed once', () => {
    expect(solveLatex('\\left(x-1\\right)^{2}\\left(x+2\\right)=0').exactLines).toEqual(['x=-2,\\ 1']);
  });

  test('works with other variable names, including subscripts and greek letters', () => {
    expect(solveLatex('2t=6').exactLines).toEqual(['t=3']);
    expect(solveLatex('x_{1}^{2}=9').exactLines).toEqual(['x_{1}=\\pm 3']);
    expect(solveLatex('2\\theta=\\pi').exactLines).toEqual(['\\theta=\\frac{\\pi}{2}']);
  });
});
