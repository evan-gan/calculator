import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('exact trig values', () => {
  test.each([
    ['\\sin\\left(\\pi\\right)', '0'],
    ['\\sin\\left(\\frac{\\pi}{6}\\right)', '\\frac{1}{2}'],
    ['\\sin\\left(\\frac{7\\pi}{6}\\right)', '-\\frac{1}{2}'],
    ['\\cos\\left(\\frac{\\pi}{4}\\right)', '\\frac{\\sqrt{2}}{2}'],
    ['\\cos\\left(\\frac{2\\pi}{3}\\right)', '-\\frac{1}{2}'],
    ['\\sin\\left(\\frac{\\pi}{12}\\right)', '\\frac{\\sqrt{6}-\\sqrt{2}}{4}'],
    ['\\tan\\left(\\frac{\\pi}{12}\\right)', '2-\\sqrt{3}'],
    ['\\tan\\left(\\frac{\\pi}{3}\\right)', '\\sqrt{3}'],
    ['\\sec\\left(\\frac{\\pi}{3}\\right)', '2'],
    ['\\cot\\left(\\frac{\\pi}{4}\\right)', '1'],
    ['\\sin\\left(\\frac{\\pi}{10}\\right)', '\\frac{\\sqrt{5}-1}{4}'],
    ['\\cos\\left(-x\\right)', '\\cos\\left(x\\right)'],
    ['\\sin\\left(-x\\right)', '-\\sin\\left(x\\right)'],
    ['\\cos\\left(\\frac{10\\pi}{9}\\right)', '-\\cos\\left(\\frac{\\pi}{9}\\right)'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('tan at π/2 is reported as undefined', () => {
    expect(() => simplifyLatex('\\tan\\left(\\frac{\\pi}{2}\\right)')).toThrow('undefined');
  });

  test('angles that are not rational multiples of π stay symbolic', () => {
    expect(simplifyLatex('\\sin\\left(1\\right)')).toBe('\\sin\\left(1\\right)');
  });
});
