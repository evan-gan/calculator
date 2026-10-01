import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('cubic and higher-degree polynomials', () => {
  test('rational roots are found and deflated', () => {
    expect(solveLatex('2x^{3}-3x^{2}-11x+6=0').exactLines).toEqual(['x=-2,\\ \\frac{1}{2},\\ 3']);
  });

  test('x^n = c uses real roots', () => {
    expect(solveLatex('x^{3}=2').exactLines).toEqual(['x=\\sqrt[3]{2}']);
    expect(solveLatex('x^{3}=-27').exactLines).toEqual(['x=-3']);
    expect(solveLatex('x^{6}=64').exactLines).toEqual(['x=\\pm 2']);
  });

  test('biquadratics are solved by substituting u = x²', () => {
    expect(solveLatex('x^{4}-5x^{2}+4=0').exactLines).toEqual(['x=\\pm 1,\\ \\pm 2']);
  });

  test('a cubic with one real irrational root uses Cardano', () => {
    const display = solveLatex('x^{3}+x+1=0');
    expect(display.exactLines[0]).toContain('\\sqrt[3]');
    expect(display.decimalLines).toEqual(['x\\approx -0.682327803828']);
  });

  test('a cubic with three irrational real roots uses the trig form', () => {
    expect(solveLatex('x^{3}-3x+1=0').decimalLines).toEqual(['x\\approx -1.87938524157,\\ 0.347296355334,\\ 1.53208888624']);
  });

  test('a factor of x gives the root 0', () => {
    expect(solveLatex('x^{3}-4x=0').exactLines).toEqual(['x=0,\\ \\pm 2']);
  });

  test('degree 5 with no exact roots falls back to labelled approximations', () => {
    const display = solveLatex('x^{5}-x-1=0');
    expect(display.exactLines).toEqual(['x\\approx 1.16730397826']);
    expect(display.notes[0]).toMatch(/approximate/);
  });
});
