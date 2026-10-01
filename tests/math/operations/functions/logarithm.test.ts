import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('exact logarithms', () => {
  test.each([
    ['\\log_{2}8', '3'],
    ['\\log_{4}8', '\\frac{3}{2}'],
    ['\\log_{2}\\left(\\frac{1}{8}\\right)', '-3'],
    ['\\log_{\\frac{1}{2}}4', '-2'],
    ['\\log1000', '3'],
    ['\\log_{2}\\left(\\sqrt{8}\\right)', '\\frac{3}{2}'],
    ['\\ln\\left(e^{2}\\right)', '2'],
    ['\\ln1', '0'],
    ['\\ln\\left(e\\right)', '1'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test('logs with no exact value stay symbolic', () => {
    expect(simplifyLatex('\\log_{3}7')).toBe('\\log_{3}\\left(7\\right)');
  });

  test('logs of non-positive numbers and bad bases are domain errors', () => {
    expect(() => simplifyLatex('\\ln\\left(-1\\right)')).toThrow('positive numbers');
    expect(() => simplifyLatex('\\log_{1}5')).toThrow('base');
  });
});
