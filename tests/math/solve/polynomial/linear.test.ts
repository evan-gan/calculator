import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('linear equations', () => {
  test.each([
    ['3x+5=11', 'x=2'],
    ['\\frac{x}{3}-\\frac{1}{2}=0', 'x=\\frac{3}{2}'],
    ['0.1x=0.3', 'x=3'],
    ['\\sqrt{2}x=1', 'x=\\frac{\\sqrt{2}}{2}'],
    ['\\pi x=2', 'x=\\frac{2}{\\pi}'],
    ['2\\left(x-1\\right)=x', 'x=2'],
  ])('%s gives %s', (equation, expected) => {
    expect(solveLatex(equation).exactLines).toEqual([expected]);
  });
});

describe('linear equations with irrational coefficients', () => {
  test('√24 + 4 + sin(π/4) = θe is fully simplified over one denominator', () => {
    expect(solveLatex('\\sqrt{24}+4+\\sin\\left(\\frac{\\pi}{4}\\right)=\\theta e').exactLines).toEqual([
      '\\theta=\\frac{8+\\sqrt{2}+4 \\sqrt{6}}{2 e}',
    ]);
  });
});
