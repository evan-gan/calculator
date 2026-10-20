import type { PixelSize, Point, ViewWindow } from '../../math';

/**
 * What part of the plane is on screen. `unitsPerPixelX/Y` are how many graph units one CSS
 * pixel covers along each axis (smaller = zoomed in). They start equal so circles look round;
 * typing different x and y ranges in the settings makes them differ.
 */
export interface Viewport {
  centerX: number;
  centerY: number;
  unitsPerPixelX: number;
  unitsPerPixelY: number;
}

// The home view shows x from -10 to 10 across the canvas.
const HOME_HALF_WIDTH = 10;
// Beyond these, floating point can't place pixels distinctly or labels become meaningless.
const MIN_UNITS_PER_PIXEL = 1e-10;
const MAX_UNITS_PER_PIXEL = 1e10;

const clampScale = (unitsPerPixel: number) => Math.min(MAX_UNITS_PER_PIXEL, Math.max(MIN_UNITS_PER_PIXEL, unitsPerPixel));

export function homeViewport(size: PixelSize): Viewport {
  const unitsPerPixel = (2 * HOME_HALF_WIDTH) / Math.max(1, size.width);
  return { centerX: 0, centerY: 0, unitsPerPixelX: unitsPerPixel, unitsPerPixelY: unitsPerPixel };
}

export function visibleWindow(viewport: Viewport, size: PixelSize): ViewWindow {
  const halfWidth = (size.width / 2) * viewport.unitsPerPixelX;
  const halfHeight = (size.height / 2) * viewport.unitsPerPixelY;
  return {
    xMin: viewport.centerX - halfWidth,
    xMax: viewport.centerX + halfWidth,
    yMin: viewport.centerY - halfHeight,
    yMax: viewport.centerY + halfHeight,
  };
}

/** The viewport that shows exactly `window` (e.g. ranges typed in the settings), or null if it's empty. */
export function viewportForWindow(window: ViewWindow, size: PixelSize): Viewport | null {
  if (!(window.xMax > window.xMin && window.yMax > window.yMin) || size.width <= 0 || size.height <= 0) return null;
  return {
    centerX: (window.xMin + window.xMax) / 2,
    centerY: (window.yMin + window.yMax) / 2,
    unitsPerPixelX: clampScale((window.xMax - window.xMin) / size.width),
    unitsPerPixelY: clampScale((window.yMax - window.yMin) / size.height),
  };
}

/** Graph point → CSS pixel position (y grows downward on screen). */
export function toScreen(viewport: Viewport, size: PixelSize, point: Point): Point {
  return {
    x: size.width / 2 + (point.x - viewport.centerX) / viewport.unitsPerPixelX,
    y: size.height / 2 - (point.y - viewport.centerY) / viewport.unitsPerPixelY,
  };
}

/** CSS pixel position → graph point. */
export function toGraph(viewport: Viewport, size: PixelSize, pixel: Point): Point {
  return {
    x: viewport.centerX + (pixel.x - size.width / 2) * viewport.unitsPerPixelX,
    y: viewport.centerY - (pixel.y - size.height / 2) * viewport.unitsPerPixelY,
  };
}

/** Move the plane with a drag of (dx, dy) pixels, so the point under the pointer follows it. */
export function panByPixels(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    ...viewport,
    centerX: viewport.centerX - dx * viewport.unitsPerPixelX,
    centerY: viewport.centerY + dy * viewport.unitsPerPixelY,
  };
}

/**
 * Zoom by `factor` (> 1 zooms in) keeping the graph point under `pixel` where it is,
 * like zooming a map at the cursor. Both axes scale together, so their ratio is kept.
 */
export function zoomAround(viewport: Viewport, size: PixelSize, factor: number, pixel: Point): Viewport {
  const anchor = toGraph(viewport, size, pixel);
  // One clamped factor for both axes, so hitting the limit doesn't distort the aspect ratio.
  const largest = Math.max(viewport.unitsPerPixelX, viewport.unitsPerPixelY);
  const smallest = Math.min(viewport.unitsPerPixelX, viewport.unitsPerPixelY);
  const appliedFactor = Math.min(Math.max(factor, largest / MAX_UNITS_PER_PIXEL), smallest / MIN_UNITS_PER_PIXEL);
  const unitsPerPixelX = viewport.unitsPerPixelX / appliedFactor;
  const unitsPerPixelY = viewport.unitsPerPixelY / appliedFactor;
  return {
    unitsPerPixelX,
    unitsPerPixelY,
    centerX: anchor.x - (pixel.x - size.width / 2) * unitsPerPixelX,
    centerY: anchor.y + (pixel.y - size.height / 2) * unitsPerPixelY,
  };
}
