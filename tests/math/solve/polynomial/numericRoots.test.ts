import { describe, expect, test } from 'vitest';
import { approximateRealRoots } from '../../../../src/math/solve/polynomial/numericRoots';

describe('approximateRealRoots (Durand–Kerner)', () => {
  test('finds the real roots of (x-1)(x-2)(x+3)', () => {
    // x³ - 7x + 6, coefficients low -> high
    const roots = approximateRealRoots([6, -7, 0, 1]);
    expect(roots).toHaveLength(3);
    [-3, 1, 2].forEach((expected, index) => expect(roots[index]).toBeCloseTo(expected, 9));
  });

  test('skips complex roots', () => {
    expect(approximateRealRoots([1, 0, 1])).toEqual([]);
  });
});
