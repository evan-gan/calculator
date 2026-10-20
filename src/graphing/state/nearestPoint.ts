import type { PixelSize, Point, Polyline } from '../../math';
import { toScreen, type Viewport } from './viewport';

/** A curve's points as drawn on screen this frame. */
export interface TracedCurve {
  id: number;
  polylines: Polyline[];
}

export interface CurveHit {
  curveId: number;
  /** The closest point on the drawn curve, in graph units. */
  point: Point;
  /** How far it is from the pointer, in CSS pixels. */
  pixelDistance: number;
}

interface SegmentHit {
  share: number;
  distance: number;
}

/** Closest point of segment a→b to `pixel`, as a share of the way from a to b (all on screen). */
function closestOnSegment(pixel: Point, start: Point, end: Point): SegmentHit {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const share = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((pixel.x - start.x) * dx + (pixel.y - start.y) * dy) / lengthSquared));
  return { share, distance: Math.hypot(start.x + dx * share - pixel.x, start.y + dy * share - pixel.y) };
}

/**
 * The point on the drawn curves closest to the pointer. The answer comes from the points already
 * traced for drawing (interpolated along the segment), so nothing is evaluated again. Distances
 * are measured on screen, so it works the same whatever the x and y scales.
 *
 * Args:
 *   curves: polylines drawn this frame, per curve
 *   pixel: pointer position in CSS pixels
 *   viewport, size: the current view
 *   maxPixels: ignore curves farther than this (Infinity to always find one)
 *   onlyCurveId: restrict the search to one curve (while dragging along it)
 *
 * Returns:
 *   The closest hit, or null when no curve is within reach.
 */
export function nearestCurvePoint(
  curves: TracedCurve[],
  pixel: Point,
  viewport: Viewport,
  size: PixelSize,
  maxPixels: number,
  onlyCurveId: number | null = null,
): CurveHit | null {
  let best: CurveHit | null = null;
  for (const curve of curves) {
    if (onlyCurveId !== null && curve.id !== onlyCurveId) continue;
    for (const polyline of curve.polylines) {
      let previousScreen = toScreen(viewport, size, polyline[0]);
      // A one-point polyline is a lone dot: compare against the point itself.
      const segmentCount = Math.max(1, polyline.length - 1);
      for (let index = 0; index < segmentCount; index++) {
        const nextPoint = polyline[Math.min(index + 1, polyline.length - 1)];
        const nextScreen = toScreen(viewport, size, nextPoint);
        const hit = closestOnSegment(pixel, previousScreen, nextScreen);
        if (hit.distance <= maxPixels && (best === null || hit.distance < best.pixelDistance)) {
          const start = polyline[index];
          best = {
            curveId: curve.id,
            point: { x: start.x + (nextPoint.x - start.x) * hit.share, y: start.y + (nextPoint.y - start.y) * hit.share },
            pixelDistance: hit.distance,
          };
        }
        previousScreen = nextScreen;
      }
    }
  }
  return best;
}
