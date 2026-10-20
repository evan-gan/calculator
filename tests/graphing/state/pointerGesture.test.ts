import { describe, expect, test } from 'vitest';
import { PointerGesture } from '../../../src/graphing/state/pointerGesture';
import { homeViewport, toGraph, toScreen } from '../../../src/graphing/state/viewport';

const SIZE = { width: 800, height: 600 };

describe('PointerGesture: drag to pan, pinch to zoom', () => {
  test('one pointer drags the plane', () => {
    const gesture = new PointerGesture();
    const viewport = homeViewport(SIZE);
    const grabbed = toGraph(viewport, SIZE, { x: 200, y: 200 });
    gesture.down(1, { x: 200, y: 200 });
    const moved = gesture.move(1, { x: 260, y: 240 }, viewport, SIZE);
    const after = toScreen(moved, SIZE, grabbed);
    expect(after.x).toBeCloseTo(260);
    expect(after.y).toBeCloseTo(240);
  });

  test('moving a pointer that is not down changes nothing', () => {
    const viewport = homeViewport(SIZE);
    expect(new PointerGesture().move(7, { x: 10, y: 10 }, viewport, SIZE)).toBe(viewport);
  });

  test('spreading two fingers apart zooms in by the distance ratio', () => {
    const gesture = new PointerGesture();
    const viewport = homeViewport(SIZE);
    gesture.down(1, { x: 300, y: 300 });
    gesture.down(2, { x: 500, y: 300 });
    const zoomed = gesture.move(2, { x: 700, y: 300 }, viewport, SIZE);
    // Distance 200 → 400 doubles the scale.
    expect(zoomed.unitsPerPixelX).toBeCloseTo(viewport.unitsPerPixelX / 2);
  });

  test('after lifting, the gesture is no longer active', () => {
    const gesture = new PointerGesture();
    gesture.down(1, { x: 0, y: 0 });
    gesture.up(1);
    expect(gesture.active).toBe(false);
  });
});
