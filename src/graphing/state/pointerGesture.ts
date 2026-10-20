import type { PixelSize, Point } from '../../math';
import { panByPixels, zoomAround, type Viewport } from './viewport';

/**
 * Turns pointer movement into pan and zoom: one finger or mouse drags the plane, two fingers
 * pinch to zoom around their midpoint (and pan as the midpoint moves).
 */
export class PointerGesture {
  private readonly pointers = new Map<number, Point>();

  get active(): boolean {
    return this.pointers.size > 0;
  }

  down(pointerId: number, position: Point): void {
    this.pointers.set(pointerId, position);
  }

  up(pointerId: number): void {
    this.pointers.delete(pointerId);
  }

  /**
   * Move one pointer and return the new viewport (unchanged if the pointer isn't down).
   * With three or more pointers only the first two count.
   */
  move(pointerId: number, position: Point, viewport: Viewport, size: PixelSize): Viewport {
    const previous = this.pointers.get(pointerId);
    if (!previous) return viewport;
    const [first, second] = [...this.pointers.keys()];
    const isPinch = this.pointers.size >= 2 && (pointerId === first || pointerId === second);
    if (!isPinch) {
      this.pointers.set(pointerId, position);
      return this.pointers.size === 1 ? panByPixels(viewport, position.x - previous.x, position.y - previous.y) : viewport;
    }
    const otherId = pointerId === first ? second : first;
    const other = this.pointers.get(otherId)!;
    const before = { distance: distance(previous, other), middle: midpoint(previous, other) };
    const after = { distance: distance(position, other), middle: midpoint(position, other) };
    this.pointers.set(pointerId, position);
    // Pan first so the point that was under the fingers' midpoint follows it, then zoom around it.
    const panned = panByPixels(viewport, after.middle.x - before.middle.x, after.middle.y - before.middle.y);
    return before.distance > 0 ? zoomAround(panned, size, after.distance / before.distance, after.middle) : panned;
  }
}

function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function midpoint(first: Point, second: Point): Point {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}
