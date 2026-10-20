import { describe, expect, test } from 'vitest';
import { sampleFunction } from '../../../src/math/graph/sampleFunction';

describe('sampleFunction: sampling a function into connected runs', () => {
  test('a continuous function is one run covering the whole range', () => {
    const runs = sampleFunction((x) => x * x, -2, 2, 100, 4);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toHaveLength(101);
    expect(runs[0][0]).toEqual({ input: -2, output: 4 });
  });

  test('a steep but continuous line is not broken', () => {
    expect(sampleFunction((x) => 1000 * x, -10, 10, 200, 20)).toHaveLength(1);
  });

  test('1/x splits into two runs at the pole', () => {
    expect(sampleFunction((x) => 1 / x, -10, 10, 201, 20)).toHaveLength(2);
  });

  test('tan x breaks at every pole in view', () => {
    // Poles at ±π/2, ±3π/2, ±5π/2 inside [-10, 10]: six poles, seven runs.
    expect(sampleFunction(Math.tan, -10, 10, 2000, 12)).toHaveLength(7);
  });

  test('a jump (floor) breaks the curve instead of drawing a vertical line', () => {
    // Jumps at 1 and 2 inside [0, 2.9]: three flat pieces.
    expect(sampleFunction(Math.floor, 0, 2.9, 290, 6)).toHaveLength(3);
  });

  test('undefined regions are left out, and the run reaches the domain edge', () => {
    const runs = sampleFunction((x) => Math.sqrt(1 - x * x), -3, 3, 60, 4);
    expect(runs).toHaveLength(1);
    expect(runs[0][0].input).toBeCloseTo(-1, 6);
    expect(runs[0][runs[0].length - 1].input).toBeCloseTo(1, 6);
  });

  test('a function defined nowhere gives no runs', () => {
    expect(sampleFunction(() => NaN, 0, 1, 10, 1)).toEqual([]);
  });
});
