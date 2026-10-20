import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('power and radical simplification', () => {
  test.each([
    ['\\sqrt{72}', '6 \\sqrt{2}'],
    ['\\sqrt{\\frac{3}{8}}', '\\frac{\\sqrt{6}}{4}'],
    ['\\sqrt[3]{54}', '3 \\sqrt[3]{2}'],
    ['\\sqrt[3]{-8}', '-2'],
    ['\\left(-8\\right)^{\\frac{2}{3}}', '4'],
    ['\\frac{1}{\\sqrt{2}}', '\\frac{\\sqrt{2}}{2}'],
    ['2^{10}', '1024'],
    ['2^{-3}', '\\frac{1}{8}'],
    ['\\left(1+\\sqrt{2}\\right)^{2}', '3+2 \\sqrt{2}'],
    ['\\sqrt{x^{2}}', '\\left|x\\right|'],
    ['\\left(x^{3}\\right)^{2}', 'x^{6}'],
    ['e^{\\ln3}', '3'],
    ['\\left(4x\\right)^{\\frac{1}{2}}', '2 \\sqrt{x}'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('even roots of negative numbers are rejected over the reals', () => {
    expect(() => simplifyLatex('\\sqrt{-4}')).toThrow('not real');
  });

  test('0^0 and division by zero are errors', () => {
    expect(() => simplifyLatex('0^{0}')).toThrow('undefined');
    expect(() => simplifyLatex('\\frac{1}{0}')).toThrow('Division by zero');
  });

  test('refuses exact results that would be enormous', () => {
    expect(() => simplifyLatex('2^{1000000}')).toThrow('too large');
  });
});

describe('roots of products with variable powers', () => {
  test.each([
    ['\\sqrt{a^2b}', '\\sqrt{b} \\left|a\\right|'],
    ['\\sqrt{x^2y^4z}', 'y^{2} \\sqrt{z} \\left|x\\right|'],
    ['\\sqrt[3]{x^3y}', 'x \\sqrt[3]{y}'],
    ['\\sqrt[3]{x^3}', 'x'],
    ['\\sqrt{xy}', '\\sqrt{x y}'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });
});
