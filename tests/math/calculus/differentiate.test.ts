import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('derivatives', () => {
  test.each([
    ['\\frac{d}{dx}x^{2}', '2 x'],
    ['\\frac{d}{dx}\\left(x^{3}+2x\\right)', '3 x^{2}+2'],
    ['\\frac{d}{dx}5', '0'],
    ['\\frac{d}{dx}\\frac{1}{x}', '-\\frac{1}{x^{2}}'],
    ['\\frac{d}{dx}\\sqrt{x}', '\\frac{1}{2 \\sqrt{x}}'],
  ])('power and sum rules: %s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test.each([
    ['\\frac{d}{dx}\\sin\\left(x^{2}\\right)', '2 x \\cos\\left(x^{2}\\right)'],
    ['\\frac{d}{dx}e^{3x}', '3 e^{3 x}'],
    ['\\frac{d}{dx}\\ln\\left(x\\right)', '\\frac{1}{x}'],
    ['\\frac{d}{dx}\\log _2x', '\\frac{1}{x \\ln\\left(2\\right)}'],
    ['\\frac{d}{dx}\\arctan x', '\\frac{1}{x^{2}+1}'],
    ['\\frac{d}{dx}\\left|x\\right|', '\\frac{x}{\\left|x\\right|}'],
  ])('chain rule through functions: %s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('variable exponents use logarithmic differentiation', () => {
    expect(simplifyLatex('\\frac{d}{dx}x^{x}')).toBe('x^{x} \\left(\\ln\\left(x\\right)+1\\right)');
  });

  test('higher-order derivatives', () => {
    expect(simplifyLatex('\\frac{d^{2}}{dx^{2}}x^{4}')).toBe('12 x^{2}');
  });

  test('other letters are constants', () => {
    expect(simplifyLatex('\\frac{d}{dx}ax^{2}')).toBe('2 a x');
  });

  test('differentiating an integral undoes it', () => {
    expect(simplifyLatex('\\frac{d}{dx}\\int x^{2}dx')).toBe('x^{2}');
    expect(simplifyLatex('\\frac{d}{dx}\\int _0^{x^{2}}\\sin t\\,dt')).toBe('2 x \\sin\\left(x^{2}\\right)');
  });

  test('factorials have no derivative', () => {
    expect(() => simplifyLatex('\\frac{d}{dx}x!')).toThrow("can't be differentiated");
  });
});
