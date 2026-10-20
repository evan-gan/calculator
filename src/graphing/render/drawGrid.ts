import type { PixelSize } from '../../math';
import type { AxisSettings, GraphSettings } from '../state/graphSettings';
import { toScreen, visibleWindow, type Viewport } from '../state/viewport';
import { drawAxes } from './drawAxes';
import { drawPolarGrid } from './drawPolarGrid';
import type { GraphTheme } from './graphTheme';
import { crispPixel, gridValues, strokeLines } from './gridLines';
import { customGridSteps, gridSteps, type GridSteps } from './gridSteps';

export interface AxisSteps {
  x: GridSteps;
  y: GridSteps;
}

/** Gridline spacing per axis: the step typed in the settings when it's drawable, else automatic. */
export function axisSteps(viewport: Viewport, settings: GraphSettings): AxisSteps {
  const stepsFor = (axis: AxisSettings, unitsPerPixel: number) =>
    (axis.step !== null ? customGridSteps(axis.step, unitsPerPixel) : null) ?? gridSteps(unitsPerPixel);
  return { x: stepsFor(settings.xAxis, viewport.unitsPerPixelX), y: stepsFor(settings.yAxis, viewport.unitsPerPixelY) };
}

function drawCartesianLines(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  size: PixelSize,
  steps: { x: number; y: number },
  color: string,
): void {
  const window = visibleWindow(viewport, size);
  strokeLines(context, color, 1, () => {
    for (const x of gridValues(window.xMin, window.xMax, steps.x)) {
      const screenX = crispPixel(toScreen(viewport, size, { x, y: 0 }).x);
      context.moveTo(screenX, 0);
      context.lineTo(screenX, size.height);
    }
    for (const y of gridValues(window.yMin, window.yMax, steps.y)) {
      const screenY = crispPixel(toScreen(viewport, size, { x: 0, y }).y);
      context.moveTo(0, screenY);
      context.lineTo(size.width, screenY);
    }
  });
}

/** Background, gridlines (cartesian or polar), axes, arrows and labels, as the settings ask. */
export function drawGrid(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  size: PixelSize,
  theme: GraphTheme,
  settings: GraphSettings,
): void {
  context.fillStyle = theme.background;
  context.fillRect(0, 0, size.width, size.height);
  const steps = axisSteps(viewport, settings);
  if (settings.showGrid && settings.gridType === 'polar') {
    drawPolarGrid(context, viewport, size, steps.x, theme, settings.showMinorGridlines);
  } else if (settings.showGrid) {
    if (settings.showMinorGridlines) drawCartesianLines(context, viewport, size, { x: steps.x.minor, y: steps.y.minor }, theme.minorGrid);
    drawCartesianLines(context, viewport, size, { x: steps.x.major, y: steps.y.major }, theme.majorGrid);
  }
  drawAxes(context, viewport, size, theme, settings, steps);
}
