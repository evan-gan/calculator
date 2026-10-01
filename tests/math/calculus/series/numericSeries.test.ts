import { describe, expect, test } from 'vitest';
import { numericInfiniteSum } from '../../../../src/math/calculus/series/numericSeries';

describe('numeric infinite sums', () => {
  test('fast-shrinking terms are added until negligible', () => {
    expect(numericInfiniteSum((n) => 1 / 2 ** n, 0)).toBeCloseTo(2, 14);
  });

  test('slowly shrinking positive terms get an Euler–Maclaurin tail', () => {
    expect(numericInfiniteSum((n) => 1 / n ** 2, 1)).toBeCloseTo(Math.PI ** 2 / 6, 10);
  });

  test('alternating series are averaged', () => {
    expect(numericInfiniteSum((n) => (-1) ** (n + 1) / n, 1)).toBeCloseTo(Math.LN2, 10);
  });

  test('divergent series return null', () => {
    expect(numericInfiniteSum((n) => 1 / n, 1)).toBeNull();
    expect(numericInfiniteSum((n) => (-1) ** n, 0)).toBeNull();
  });
});
