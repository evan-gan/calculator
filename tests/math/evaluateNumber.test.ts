import { describe, expect, test } from 'vitest';
import { evaluateNumberInput } from '../../src/math';

describe('evaluateNumberInput: numbers typed in plain text boxes', () => {
  test('plain numbers, including a typographic minus and 1e3 notation', () => {
    expect(evaluateNumberInput('-10')).toBe(-10);
    expect(evaluateNumberInput('−3.5')).toBe(-3.5);
    expect(evaluateNumberInput('1e3')).toBe(1000);
  });

  test('constants and simple expressions: 2pi, 2π, 1/2, √2', () => {
    expect(evaluateNumberInput('2pi')).toBeCloseTo(2 * Math.PI);
    expect(evaluateNumberInput('2π')).toBeCloseTo(2 * Math.PI);
    expect(evaluateNumberInput('1/2')).toBe(0.5);
    expect(evaluateNumberInput('√2')).toBeCloseTo(Math.SQRT2);
  });

  test('empty text, variables and nonsense give null', () => {
    expect(evaluateNumberInput('')).toBeNull();
    expect(evaluateNumberInput('x')).toBeNull();
    expect(evaluateNumberInput('2+')).toBeNull();
    expect(evaluateNumberInput('\\sqrt{-1}')).toBeNull();
  });
});
