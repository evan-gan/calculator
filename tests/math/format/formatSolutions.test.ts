import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../helpers';

describe('solution display', () => {
  test('quadratic roots with an irrational offset are grouped with ±', () => {
    expect(solveLatex('x^{2}-6x+4=0').exactLines).toEqual(['x=3\\pm \\sqrt{5}']);
  });

  test('± groups share a fraction bar when both parts have a denominator', () => {
    expect(solveLatex('x^{2}+x-1=0').exactLines).toEqual(['x=\\frac{-1\\pm \\sqrt{5}}{2}']);
  });

  test('symmetric pairs read ±1, ±2 in increasing order', () => {
    expect(solveLatex('x^{4}-5x^{2}+4=0').exactLines).toEqual(['x=\\pm 1,\\ \\pm 2']);
  });

  test('decimal lines use = for terminating decimals and ≈ otherwise', () => {
    expect(solveLatex('2x=1').decimalLines).toEqual(['x=0.5']);
    expect(solveLatex('3x=1').decimalLines).toEqual(['x\\approx 0.333333333333']);
  });

  test('periodic solutions show the period and a note about n', () => {
    const display = solveLatex('\\tan\\left(x\\right)=1');
    expect(display.exactLines).toEqual(['x=\\frac{\\pi}{4}+\\pi n']);
    expect(display.notes).toContain('n can be any integer.');
  });
});
