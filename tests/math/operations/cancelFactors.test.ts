import { describe, expect, test } from 'vitest';
import { simplifyLatex, solveLatex } from '../../helpers';

describe('cancelling factors shared by a fraction with sums', () => {
  test.each([
    ['\\frac{mg\\sin\\theta-ma}{mg\\cos\\theta}', '\\frac{g \\sin\\left(\\theta\\right)-a}{g \\cos\\left(\\theta\\right)}'],
    ['\\frac{ax+ay}{a}', 'x+y'],
    ['\\frac{ax+ay}{bx+by}', '\\frac{a}{b}'],
    ['\\frac{x^2+x}{x}', 'x+1'],
    ['\\frac{4x^2y+2xy^2}{2xy}', '2 x+y'],
    ['\\frac{e^xx+e^x}{e^x}', 'x+1'],
    ['\\frac{a\\sqrt{x}+b\\sqrt{x}}{\\sqrt{x}}', 'a+b'],
    ['\\frac{\\sin^2x+\\sin x}{\\sin x}', '\\sin\\left(x\\right)+1'],
  ])('common factors: %s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test.each([
    ['\\frac{3a+6b}{9c}', '\\frac{a+2 b}{3 c}'],
    ['\\frac{x+1}{2x+2}', '\\frac{1}{2}'],
    ['\\frac{-a-b}{-c}', '\\frac{a+b}{c}'],
    ['\\frac{x}{3}\\left(3a+6b\\right)', 'x \\left(a+2 b\\right)'],
  ])('numbers and signs: %s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test.each([
    ['\\frac{x^2-1}{x-1}', 'x+1'],
    ['\\frac{x^3-8}{x-2}', 'x^{2}+2 x+4'],
    ['\\frac{x+1}{x^2-1}', '\\frac{1}{x-1}'],
    ['\\frac{2-x}{x-2}', '-1'],
    ['\\frac{1-x}{x^2-1}', '-\\frac{1}{x+1}'],
    ['\\frac{a^2-b^2}{a+b}', 'a-b'],
    ['\\frac{x^4-y^4}{x^2+y^2}', 'x^{2}-y^{2}'],
  ])('exact polynomial division: %s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test.each([
    ['\\frac{x^2+1}{x+1}', '\\frac{x^{2}+1}{x+1}'],
    ['\\frac{x}{x^2+1}', '\\frac{x}{x^{2}+1}'],
    ['\\frac{3a+6b}{c}', '\\frac{3 a+6 b}{c}'],
    ['2\\left(\\frac{x^2}{2}+\\frac{x}{2}\\right)', 'x^{2}+x'],
  ])('leaves fractions with nothing to cancel alone: %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('equations still reject the point a cancelled factor removed', () => {
    expect(solveLatex('\\frac{x^2-x}{x-1}=1').notes).toContain('No real solution.');
    expect(solveLatex('\\frac{x^2-1}{x-1}=0').exactLines).toEqual(['x=-1']);
  });
});
