import type { PixelSize, Polyline } from '../../math';
import { toScreen, type Viewport } from '../state/viewport';

/**
 * Canvas coordinates far outside the view (like tan x right beside a pole) are clamped:
 * the line still leaves the screen in the right direction, and browsers don't choke on
 * huge numbers.
 */
export function clampToCanvasRange(value: number, extent: number): number {
  return Math.min(Math.max(value, -10 * extent), 11 * extent);
}

export function drawCurve(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  size: PixelSize,
  polylines: Polyline[],
  style: { color: string; width: number },
): void {
  context.beginPath();
  for (const polyline of polylines) {
    polyline.forEach((point, index) => {
      const screen = toScreen(viewport, size, point);
      const x = clampToCanvasRange(screen.x, size.width);
      const y = clampToCanvasRange(screen.y, size.height);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    // A zero-length segment with round caps draws a dot, so a lone point still shows.
    if (polyline.length === 1) {
      const screen = toScreen(viewport, size, polyline[0]);
      context.lineTo(screen.x, screen.y);
    }
  }
  context.strokeStyle = style.color;
  context.lineWidth = style.width;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.stroke();
}
