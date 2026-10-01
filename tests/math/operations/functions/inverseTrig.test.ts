import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('exact inverse trig values', () => {
  test.each([
    ['\\arcsin\\left(\\frac{\\sqrt{3}}{2}\\right)', '\\frac{\\pi}{3}'],
    ['\\arcsin\\left(-\\frac{1}{2}\\right)', '-\\frac{\\pi}{6}'],
    ['\\arccos\\left(-\\frac{1}{2}\\right)', '\\frac{2 \\pi}{3}'],
    ['\\arccos\\left(1\\right)', '0'],
    ['\\arctan\\left(1\\right)', '\\frac{\\pi}{4}'],
    ['\\arctan\\left(-\\sqrt{3}\\right)', '-\\frac{\\pi}{3}'],
    ['\\arctan\\left(2-\\sqrt{3}\\right)', '\\frac{\\pi}{12}'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('arcsin outside [-1, 1] is a domain error', () => {
    expect(() => simplifyLatex('\\arcsin\\left(2\\right)')).toThrow('between -1 and 1');
  });

  test('values not in the table stay symbolic', () => {
    expect(simplifyLatex('\\arcsin\\left(\\frac{1}{3}\\right)')).toBe('\\arcsin\\left(\\frac{1}{3}\\right)');
  });
});
