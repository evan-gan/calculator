import type { PixelSize, Point } from '../../math';
import type { GraphSettings } from '../state/graphSettings';
import { toScreen, visibleWindow, type Viewport } from '../state/viewport';
import type { AxisSteps } from './drawGrid';
import type { GraphTheme } from './graphTheme';
import { gridValues, strokeLines } from './gridLines';
import { formatTick } from './gridSteps';

// Labels stay this far inside the canvas when their axis is scrolled off screen.
const LABEL_MARGIN = 6;
const AXIS_WIDTH = 1.5;
const ARROW_LENGTH = 11;
const ARROW_HALF_WIDTH = 5;

/** Where the axes cross on screen, plus where their labels go (kept on screen when panned away). */
function axisPlacement(viewport: Viewport, size: PixelSize, theme: GraphTheme) {
  const origin = toScreen(viewport, size, { x: 0, y: 0 });
  return {
    origin,
    // The y-axis numbers' x position, and the x-axis numbers' y position (under the axis).
    labelX: Math.min(Math.max(origin.x, LABEL_MARGIN), size.width - LABEL_MARGIN),
    labelY: Math.min(Math.max(origin.y + 4, LABEL_MARGIN), size.height - theme.labelSize - 5),
  };
}

/** Writes text with a halo in the background color so it stays readable over gridlines and curves. */
function haloWriter(context: CanvasRenderingContext2D, theme: GraphTheme, font: string) {
  context.fillStyle = theme.label;
  context.font = font;
  context.strokeStyle = theme.background;
  context.lineWidth = 3;
  return (text: string, x: number, y: number) => {
    context.strokeText(text, x, y);
    context.fillText(text, x, y);
  };
}

function drawArrowhead(context: CanvasRenderingContext2D, tip: Point, direction: Point): void {
  const back = { x: tip.x - direction.x * ARROW_LENGTH, y: tip.y - direction.y * ARROW_LENGTH };
  context.moveTo(tip.x, tip.y);
  context.lineTo(back.x - direction.y * ARROW_HALF_WIDTH, back.y + direction.x * ARROW_HALF_WIDTH);
  context.lineTo(back.x + direction.y * ARROW_HALF_WIDTH, back.y - direction.x * ARROW_HALF_WIDTH);
  context.closePath();
}

function drawAxisLines(context: CanvasRenderingContext2D, size: PixelSize, origin: Point, theme: GraphTheme, settings: GraphSettings): void {
  const showX = settings.xAxis.visible && origin.y >= 0 && origin.y <= size.height;
  const showY = settings.yAxis.visible && origin.x >= 0 && origin.x <= size.width;
  strokeLines(context, theme.axis, AXIS_WIDTH, () => {
    if (showX) {
      context.moveTo(0, origin.y);
      context.lineTo(size.width, origin.y);
    }
    if (showY) {
      context.moveTo(origin.x, 0);
      context.lineTo(origin.x, size.height);
    }
  });
  if (!settings.showArrows) return;
  context.beginPath();
  if (showX) {
    drawArrowhead(context, { x: size.width - 1, y: origin.y }, { x: 1, y: 0 });
    drawArrowhead(context, { x: 1, y: origin.y }, { x: -1, y: 0 });
  }
  if (showY) {
    drawArrowhead(context, { x: origin.x, y: 1 }, { x: 0, y: -1 });
    drawArrowhead(context, { x: origin.x, y: size.height - 1 }, { x: 0, y: 1 });
  }
  context.fillStyle = theme.axis;
  context.fill();
}

function drawNumbers(context: CanvasRenderingContext2D, viewport: Viewport, size: PixelSize, theme: GraphTheme, settings: GraphSettings, steps: AxisSteps): void {
  const window = visibleWindow(viewport, size);
  const { origin, labelX, labelY } = axisPlacement(viewport, size, theme);
  const write = haloWriter(context, theme, theme.labelFont);
  if (settings.xAxis.visible) {
    context.textAlign = 'center';
    context.textBaseline = 'top';
    for (const x of gridValues(window.xMin, window.xMax, steps.x.major)) {
      if (Math.abs(x) < steps.x.major / 2) continue;
      write(formatTick(x, steps.x.major), toScreen(viewport, size, { x, y: 0 }).x, labelY);
    }
  }
  if (settings.yAxis.visible) {
    const alignRight = labelX > size.width / 2;
    context.textAlign = alignRight ? 'right' : 'left';
    context.textBaseline = 'middle';
    const yLabelX = alignRight ? labelX - 6 : labelX + 6;
    for (const y of gridValues(window.yMin, window.yMax, steps.y.major)) {
      if (Math.abs(y) < steps.y.major / 2) continue;
      write(formatTick(y, steps.y.major), yLabelX, toScreen(viewport, size, { x: 0, y }).y);
    }
  }
  if (settings.xAxis.visible || settings.yAxis.visible) {
    context.textAlign = 'right';
    context.textBaseline = 'top';
    write('0', origin.x - 4, origin.y + 4);
  }
}

/** The axis names typed in the settings, by the positive end of each axis. */
function drawAxisNames(context: CanvasRenderingContext2D, viewport: Viewport, size: PixelSize, theme: GraphTheme, settings: GraphSettings): void {
  const { labelX } = axisPlacement(viewport, size, theme);
  const origin = toScreen(viewport, size, { x: 0, y: 0 });
  const arrowRoom = settings.showArrows ? ARROW_LENGTH + 4 : 6;
  const write = haloWriter(context, theme, theme.axisNameFont);
  const xName = settings.xAxis.label.trim();
  if (settings.xAxis.visible && xName) {
    context.textAlign = 'right';
    context.textBaseline = 'bottom';
    write(xName, size.width - arrowRoom, Math.min(Math.max(origin.y - 6, theme.labelSize + 12), size.height - 6));
  }
  const yName = settings.yAxis.label.trim();
  if (settings.yAxis.visible && yName) {
    const alignRight = labelX > size.width / 2;
    context.textAlign = alignRight ? 'right' : 'left';
    context.textBaseline = 'top';
    write(yName, alignRight ? labelX - 8 : labelX + 8, arrowRoom);
  }
}

/** Axes (each can be hidden), optional arrowheads, the number labels and the axis names. */
export function drawAxes(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  size: PixelSize,
  theme: GraphTheme,
  settings: GraphSettings,
  steps: AxisSteps,
): void {
  drawAxisLines(context, size, toScreen(viewport, size, { x: 0, y: 0 }), theme, settings);
  if (settings.showAxisNumbers) drawNumbers(context, viewport, size, theme, settings, steps);
  drawAxisNames(context, viewport, size, theme, settings);
}
