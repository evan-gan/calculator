import { describe, expect, test } from 'vitest';
import { traceImplicit } from '../../../src/math/graph/traceImplicit';

const WINDOW = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

describe('traceImplicit: marching squares for f(x, y) = 0', () => {
  test('every segment of a circle lies on the circle', () => {
    const segments = traceImplicit((x, y) => x * x + y * y - 25, WINDOW, 80, 80);
    expect(segments.length).toBeGreaterThan(50);
    for (const point of segments.flat()) expect(Math.hypot(point.x, point.y)).toBeCloseTo(5, 1);
  });

  test('no curve when the function never reaches zero', () => {
    expect(traceImplicit((x, y) => x * x + y * y + 1, WINDOW, 40, 40)).toEqual([]);
  });

  test('a sign change through a pole is not drawn', () => {
    // 1/y changes sign across y = 0 without ever being zero.
    expect(traceImplicit((_x, y) => 1 / y, WINDOW, 41, 41)).toEqual([]);
  });

  test('crossing lines (a saddle) are traced', () => {
    const segments = traceImplicit((x, y) => x * y, WINDOW, 41, 41);
    const points = segments.flat();
    expect(points.some((point) => Math.abs(point.x) < 1e-9 && point.y > 5)).toBe(true);
    expect(points.some((point) => Math.abs(point.y) < 1e-9 && point.x > 5)).toBe(true);
    for (const point of points) expect(Math.min(Math.abs(point.x), Math.abs(point.y))).toBeLessThan(1e-9);
  });

  test('cells where the function is undefined are skipped', () => {
    const segments = traceImplicit((x, y) => Math.sqrt(x) - y, WINDOW, 40, 40);
    for (const point of segments.flat()) expect(point.x).toBeGreaterThanOrEqual(0);
  });
});
