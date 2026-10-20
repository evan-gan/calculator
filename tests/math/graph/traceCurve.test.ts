import { describe, expect, test } from 'vitest';
import { evaluateGraphWorkspace, traceCurve } from '../../../src/math';

const WINDOW = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
const PIXELS = { width: 400, height: 240 };

const plotOf = (latex: string) => {
  const [line] = evaluateGraphWorkspace([latex]);
  if (!line.plot) throw new Error(`Expected a plot for ${latex}`);
  return line.plot;
};

describe('traceCurve: points to draw for a plot', () => {
  test('y = x² gives points on the parabola across the window', () => {
    const [polyline] = traceCurve(plotOf('y=x^{2}'), WINDOW, PIXELS);
    expect(polyline[0]).toEqual({ x: -10, y: 100 });
    for (const point of polyline) expect(point.y).toBeCloseTo(point.x * point.x);
  });

  test('x = sin y runs up the screen: x depends on y', () => {
    const [polyline] = traceCurve(plotOf('x=\\sin y'), WINDOW, PIXELS);
    expect(polyline[0].y).toBe(-6);
    for (const point of polyline) expect(point.x).toBeCloseTo(Math.sin(point.y));
  });

  test('an implicit circle traces points on the circle', () => {
    const segments = traceCurve(plotOf('x^{2}+y^{2}=16'), WINDOW, PIXELS);
    expect(segments.length).toBeGreaterThan(20);
    for (const point of segments.flat()) expect(Math.hypot(point.x, point.y)).toBeCloseTo(4, 1);
  });

  test('a function undefined across the window draws nothing', () => {
    expect(traceCurve(plotOf('y=\\sqrt{-x^{2}-1}'), WINDOW, PIXELS)).toEqual([]);
  });
});
