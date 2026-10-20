import { describe, expect, test } from 'vitest';
import { homeViewport, panByPixels, toGraph, toScreen, viewportForWindow, visibleWindow, zoomAround } from '../../../src/graphing/state/viewport';

const SIZE = { width: 800, height: 600 };

describe('viewport: mapping between graph units and pixels', () => {
  test('the home view shows x from -10 to 10, centred on the origin', () => {
    const window = visibleWindow(homeViewport(SIZE), SIZE);
    expect(window.xMin).toBeCloseTo(-10);
    expect(window.xMax).toBeCloseTo(10);
    expect(window.yMax).toBeCloseTo(7.5);
  });

  test('the origin is in the middle of the screen, and y grows upward', () => {
    const viewport = homeViewport(SIZE);
    expect(toScreen(viewport, SIZE, { x: 0, y: 0 })).toEqual({ x: 400, y: 300 });
    expect(toScreen(viewport, SIZE, { x: 0, y: 1 }).y).toBeLessThan(300);
  });

  test('toGraph undoes toScreen', () => {
    const viewport = { centerX: 3, centerY: -2, unitsPerPixelX: 0.05, unitsPerPixelY: 0.02 };
    const graphPoint = toGraph(viewport, SIZE, toScreen(viewport, SIZE, { x: 1.5, y: 4 }));
    expect(graphPoint.x).toBeCloseTo(1.5);
    expect(graphPoint.y).toBeCloseTo(4);
  });

  test('dragging moves the point under the pointer with it', () => {
    const viewport = homeViewport(SIZE);
    const grabbed = toGraph(viewport, SIZE, { x: 100, y: 100 });
    const moved = panByPixels(viewport, 50, -30);
    const after = toScreen(moved, SIZE, grabbed);
    expect(after.x).toBeCloseTo(150);
    expect(after.y).toBeCloseTo(70);
  });

  test('zooming keeps the point under the cursor fixed', () => {
    const viewport = homeViewport(SIZE);
    const cursor = { x: 600, y: 150 };
    const anchor = toGraph(viewport, SIZE, cursor);
    const zoomed = zoomAround(viewport, SIZE, 2, cursor);
    expect(zoomed.unitsPerPixelX).toBeCloseTo(viewport.unitsPerPixelX / 2);
    expect(zoomed.unitsPerPixelY).toBeCloseTo(viewport.unitsPerPixelY / 2);
    const after = toScreen(zoomed, SIZE, anchor);
    expect(after.x).toBeCloseTo(cursor.x);
    expect(after.y).toBeCloseTo(cursor.y);
  });

  test('zoom is clamped so floating point stays usable', () => {
    let viewport = homeViewport(SIZE);
    for (let step = 0; step < 100; step++) viewport = zoomAround(viewport, SIZE, 100, { x: 400, y: 300 });
    expect(viewport.unitsPerPixelX).toBeGreaterThanOrEqual(1e-10);
  });

  test('zooming keeps different x and y scales in the same ratio, even at the zoom limit', () => {
    let viewport = { centerX: 0, centerY: 0, unitsPerPixelX: 0.1, unitsPerPixelY: 0.01 };
    viewport = zoomAround(viewport, SIZE, 3, { x: 400, y: 300 });
    expect(viewport.unitsPerPixelX / viewport.unitsPerPixelY).toBeCloseTo(10);
    for (let step = 0; step < 100; step++) viewport = zoomAround(viewport, SIZE, 100, { x: 400, y: 300 });
    expect(viewport.unitsPerPixelX / viewport.unitsPerPixelY).toBeCloseTo(10);
    expect(viewport.unitsPerPixelY).toBeGreaterThanOrEqual(1e-10);
  });
});

describe('viewportForWindow: showing typed axis ranges', () => {
  test('the visible window becomes exactly the typed ranges', () => {
    const viewport = viewportForWindow({ xMin: -2, xMax: 6, yMin: 0, yMax: 30 }, SIZE)!;
    const window = visibleWindow(viewport, SIZE);
    expect(window.xMin).toBeCloseTo(-2);
    expect(window.xMax).toBeCloseTo(6);
    expect(window.yMin).toBeCloseTo(0);
    expect(window.yMax).toBeCloseTo(30);
  });

  test('a range whose minimum is not below its maximum is rejected', () => {
    expect(viewportForWindow({ xMin: 5, xMax: 5, yMin: 0, yMax: 1 }, SIZE)).toBeNull();
    expect(viewportForWindow({ xMin: 0, xMax: 1, yMin: 2, yMax: -2 }, SIZE)).toBeNull();
  });
});
