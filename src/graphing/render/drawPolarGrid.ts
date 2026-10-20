import type { PixelSize, Point, ViewWindow } from '../../math';
import { toScreen, visibleWindow, type Viewport } from '../state/viewport';
import type { GraphTheme } from './graphTheme';
import { gridValues, strokeLines } from './gridLines';
import type { GridSteps } from './gridSteps';

// Spokes every 15°, with every second one (30°) drawn as a major line.
const SPOKE_DEGREES = 15;
const MAJOR_SPOKE_EVERY = 2;
// Circles bigger than this on screen look straight and risk canvas precision trouble; skip them.
const MAX_CIRCLE_PIXELS = 1e7;

/** Closest and farthest distance from the origin to any point of the window. */
function radiusRange(window: ViewWindow): { min: number; max: number } {
  const nearestX = Math.min(Math.max(0, window.xMin), window.xMax);
  const nearestY = Math.min(Math.max(0, window.yMin), window.yMax);
  const farthestX = Math.max(Math.abs(window.xMin), Math.abs(window.xMax));
  const farthestY = Math.max(Math.abs(window.yMin), Math.abs(window.yMax));
  return { min: Math.hypot(nearestX, nearestY), max: Math.hypot(farthestX, farthestY) };
}

/**
 * The part of the segment from the origin to `end` inside the window (Liang–Barsky clipping),
 * or null if it misses. Clipping keeps canvas coordinates small when the origin is far away.
 */
function clipSpoke(end: Point, window: ViewWindow): [Point, Point] | null {
  let enter = 0;
  let exit = 1;
  const checks: [number, number][] = [
    [-end.x, -window.xMin],
    [end.x, window.xMax],
    [-end.y, -window.yMin],
    [end.y, window.yMax],
  ];
  for (const [direction, limit] of checks) {
    if (direction === 0) {
      if (limit < 0) return null;
      continue;
    }
    const share = limit / direction;
    if (direction < 0) enter = Math.max(enter, share);
    else exit = Math.min(exit, share);
  }
  if (enter > exit) return null;
  return [
    { x: end.x * enter, y: end.y * enter },
    { x: end.x * exit, y: end.y * exit },
  ];
}

function addCircles(context: CanvasRenderingContext2D, viewport: Viewport, size: PixelSize, radii: number[]): void {
  const origin = toScreen(viewport, size, { x: 0, y: 0 });
  for (const radius of radii) {
    const radiusX = radius / viewport.unitsPerPixelX;
    const radiusY = radius / viewport.unitsPerPixelY;
    if (radius <= 0 || Math.max(radiusX, radiusY) > MAX_CIRCLE_PIXELS) continue;
    context.moveTo(origin.x + radiusX, origin.y);
    context.ellipse(origin.x, origin.y, radiusX, radiusY, 0, 0, 2 * Math.PI);
  }
}

function addSpokes(context: CanvasRenderingContext2D, viewport: Viewport, size: PixelSize, major: boolean, reach: number): void {
  const window = visibleWindow(viewport, size);
  for (let spoke = 0; spoke < 360 / SPOKE_DEGREES; spoke++) {
    if ((spoke % MAJOR_SPOKE_EVERY === 0) !== major) continue;
    const angle = (spoke * SPOKE_DEGREES * Math.PI) / 180;
    const clipped = clipSpoke({ x: Math.cos(angle) * reach, y: Math.sin(angle) * reach }, window);
    if (!clipped) continue;
    const [start, end] = clipped.map((point) => toScreen(viewport, size, point));
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
  }
}

/** Circles around the origin at the x-axis grid spacing, and spokes every 15°. */
export function drawPolarGrid(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  size: PixelSize,
  steps: GridSteps,
  theme: GraphTheme,
  showMinor: boolean,
): void {
  const range = radiusRange(visibleWindow(viewport, size));
  // A little past the farthest corner so spokes always reach the edge of the canvas.
  const reach = range.max * 1.01 + steps.major;
  if (showMinor) {
    strokeLines(context, theme.minorGrid, 1, () => {
      addCircles(context, viewport, size, gridValues(range.min, range.max, steps.minor));
      addSpokes(context, viewport, size, false, reach);
    });
  }
  strokeLines(context, theme.majorGrid, 1, () => {
    addCircles(context, viewport, size, gridValues(range.min, range.max, steps.major));
    addSpokes(context, viewport, size, true, reach);
  });
}
