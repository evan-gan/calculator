import { describe, expect, test } from 'vitest';
import { isDefinedNear, numericLimit } from '../../../../src/math/calculus/limit/numericLimit';

describe('numeric limit estimates', () => {
  test('removable singularities are extrapolated accurately', () => {
    expect(numericLimit((x) => Math.sin(x) / x, 0, 1)).toBeCloseTo(1, 10);
    expect(numericLimit((x) => (1 - Math.cos(x)) / x ** 2, 0, -1)).toBeCloseTo(0.5, 8);
  });

  test('limits at infinity sample x = ±1/t', () => {
    expect(numericLimit((x) => (1 + 1 / x) ** x, Infinity, 1)).toBeCloseTo(Math.E, 6);
    expect(numericLimit((x) => Math.atan(x), -Infinity, -1)).toBeCloseTo(-Math.PI / 2, 8);
  });

  test('steady growth is reported as ±Infinity', () => {
    expect(numericLimit((x) => 1 / x, 0, 1)).toBe(Infinity);
    expect(numericLimit((x) => 1 / x, 0, -1)).toBe(-Infinity);
  });

  test('oscillation gives no estimate', () => {
    expect(numericLimit((x) => Math.sin(1 / x), 0, 1)).toBeNull();
  });

  test('exact zeros from float cancellation are not mistaken for the limit', () => {
    // sin(tan x) - tan(sin x) ≈ -x⁷/30, but in floats it becomes exactly 0 for small x.
    const estimate = numericLimit((x) => (Math.sin(Math.tan(x)) - Math.tan(Math.sin(x))) / x ** 7, 0, 1);
    expect(estimate === null || Math.abs(estimate + 1 / 30) < 1e-3).toBe(true);
  });

  test('definedness on a side', () => {
    expect(isDefinedNear(Math.sqrt, 0, 1)).toBe(true);
    expect(isDefinedNear(Math.sqrt, 0, -1)).toBe(false);
    // Huge x overflows eˣ - e^(x-1) to NaN, but moderate x shows it is defined.
    expect(isDefinedNear((x) => Math.exp(x) - Math.exp(x - 1), Infinity, 1)).toBe(true);
  });
});
