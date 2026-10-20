import type { PixelSize, Point } from '../../math';
import { toScreen, type Viewport } from '../state/viewport';
import type { GraphTheme } from './graphTheme';
import { formatCoordinate } from './gridSteps';

const DOT_RADIUS = 5;
// The label sits up and to the right of the dot, flipped to the other side near an edge.
const LABEL_OFFSET = 10;
const LABEL_PADDING = 6;

/** "(1.25, −3)" in decimals, precise to the current zoom. */
export function tracedPointText(point: Point, viewport: Viewport): string {
  return `(${formatCoordinate(point.x, viewport.unitsPerPixelX)}, ${formatCoordinate(point.y, viewport.unitsPerPixelY)})`;
}

/** A dot on the curve in its color, and a boxed label with the point's coordinates. */
export function drawTracedPoint(
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  size: PixelSize,
  point: Point,
  color: string,
  theme: GraphTheme,
): void {
  const screen = toScreen(viewport, size, point);
  context.beginPath();
  context.arc(screen.x, screen.y, DOT_RADIUS, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = theme.background;
  context.lineWidth = 2;
  context.stroke();

  const text = tracedPointText(point, viewport);
  context.font = theme.labelFont;
  const boxWidth = context.measureText(text).width + 2 * LABEL_PADDING;
  const boxHeight = theme.labelSize + 2 * LABEL_PADDING;
  const flipLeft = screen.x + LABEL_OFFSET + boxWidth > size.width;
  const flipDown = screen.y - LABEL_OFFSET - boxHeight < 0;
  const boxX = flipLeft ? screen.x - LABEL_OFFSET - boxWidth : screen.x + LABEL_OFFSET;
  const boxY = flipDown ? screen.y + LABEL_OFFSET : screen.y - LABEL_OFFSET - boxHeight;

  context.beginPath();
  context.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  context.fillStyle = theme.background;
  context.fill();
  context.strokeStyle = theme.majorGrid;
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = theme.label;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(text, boxX + LABEL_PADDING, boxY + boxHeight / 2);
}
