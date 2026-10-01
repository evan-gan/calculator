import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('rational equations', () => {
  test('clears denominators and solves the numerator', () => {
    expect(solveLatex('\\frac{1}{x-1}+\\frac{1}{x+1}=1').exactLines).toEqual(['x=1\\pm \\sqrt{2}']);
  });

  test('roots that make a denominator zero are rejected', () => {
    expect(solveLatex('\\frac{x^{2}-1}{x-1}=2').notes).toEqual(['No real solution.']);
  });

  test('an identity reports the points where the equation is undefined', () => {
    const display = solveLatex('\\frac{x}{x-2}=\\frac{2}{x-2}+1');
    expect(display.exactLines).toEqual(['x\\ne 2']);
    expect(display.notes[0]).toMatch(/Every other real number/);
  });
});
