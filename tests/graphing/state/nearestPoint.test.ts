import { describe, expect, test } from 'vitest';
import { nearestCurvePoint } from '../../../src/graphing/state/nearestPoint';
import { homeViewport, toScreen } from '../../../src/graphing/state/viewport';

const SIZE = { width: 800, height: 600 };
const VIEWPORT = homeViewport(SIZE);
// y = x drawn from (-5, -5) to (5, 5), and a horizontal line y = 3.
const DIAGONAL = { id: 1, polylines: [[{ x: -5, y: -5 }, { x: 0, y: 0 }, { x: 5, y: 5 }]] };
const HORIZONTAL = { id: 2, polylines: [[{ x: -5, y: 3 }, { x: 5, y: 3 }]] };

describe('nearestCurvePoint: the drawn point closest to the pointer', () => {
  test('finds the closest point between two traced samples', () => {
    const pixel = toScreen(VIEWPORT, SIZE, { x: 2, y: 2.1 });
    const hit = nearestCurvePoint([DIAGONAL], pixel, VIEWPORT, SIZE, 10)!;
    expect(hit.curveId).toBe(1);
    expect(hit.point.x).toBeCloseTo(2.05);
    expect(hit.point.y).toBeCloseTo(2.05);
  });

  test('picks the closer of two curves', () => {
    const pixel = toScreen(VIEWPORT, SIZE, { x: -4, y: 2.9 });
    expect(nearestCurvePoint([DIAGONAL, HORIZONTAL], pixel, VIEWPORT, SIZE, 10)?.curveId).toBe(2);
  });

  test('returns null when every curve is farther than the reach', () => {
    const pixel = toScreen(VIEWPORT, SIZE, { x: 4, y: -4 });
    expect(nearestCurvePoint([DIAGONAL, HORIZONTAL], pixel, VIEWPORT, SIZE, 10)).toBeNull();
  });

  test('restricted to one curve, it follows that curve however far the pointer goes', () => {
    const pixel = toScreen(VIEWPORT, SIZE, { x: -4, y: 2.9 });
    const hit = nearestCurvePoint([DIAGONAL, HORIZONTAL], pixel, VIEWPORT, SIZE, Infinity, 1)!;
    expect(hit.curveId).toBe(1);
  });

  test('a lone traced point can be picked', () => {
    const dot = { id: 3, polylines: [[{ x: 1, y: 1 }]] };
    const hit = nearestCurvePoint([dot], toScreen(VIEWPORT, SIZE, { x: 1.1, y: 1 }), VIEWPORT, SIZE, 10)!;
    expect(hit.point).toEqual({ x: 1, y: 1 });
  });

  test('stays at the end of the curve past its last sample', () => {
    const hit = nearestCurvePoint([DIAGONAL], toScreen(VIEWPORT, SIZE, { x: 5.1, y: 5.1 }), VIEWPORT, SIZE, 10)!;
    expect(hit.point).toEqual({ x: 5, y: 5 });
  });
});
