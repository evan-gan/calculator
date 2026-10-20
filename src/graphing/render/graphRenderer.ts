import type { PixelSize, Point } from '../../math';
import type { GraphSettings, TextSize } from '../state/graphSettings';
import type { TracedCurve } from '../state/nearestPoint';
import type { Viewport } from '../state/viewport';
import type { GraphCurve } from '../types';
import { drawCurve } from './drawCurves';
import { drawGrid } from './drawGrid';
import { drawTracedPoint } from './drawTracedPoint';
import { readGraphTheme, type GraphTheme } from './graphTheme';
import { TraceCache } from './traceCache';

/** Everything one frame shows. */
export interface GraphFrame {
  viewport: Viewport;
  size: PixelSize;
  curves: GraphCurve[];
  settings: GraphSettings;
  /** The point being traced (held on a curve), if any. */
  tracedPoint: { curveId: number; point: Point } | null;
  /** Mid-gesture: tracing is limited to a time budget per frame so dragging stays smooth. */
  interacting: boolean;
}

/**
 * Draws frames onto one canvas, keeping the expensive parts between frames: the canvas buffer
 * (only reallocated when its size changes), the theme colors (only re-read when the scheme or
 * text size changes) and each curve's trace (see TraceCache).
 */
// Mid-gesture, tracing new tiles stops after this long each frame (60fps leaves ~16ms in total).
const GESTURE_TRACE_BUDGET_MS = 8;

export class GraphRenderer {
  private readonly traceCache = new TraceCache();
  private theme: { textSize: TextSize; value: GraphTheme } | null = null;
  /** What was drawn last frame, for finding the curve point under the pointer without re-evaluating. */
  drawnCurves: TracedCurve[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {}

  /** Call when the color scheme changes so the next frame reads the new tokens. */
  invalidateTheme(): void {
    this.theme = null;
  }

  private themeFor(textSize: TextSize): GraphTheme {
    if (this.theme?.textSize !== textSize) this.theme = { textSize, value: readGraphTheme(this.canvas, textSize) };
    return this.theme.value;
  }

  /** Resize the backing buffer only when needed: assigning width/height clears and reallocates it. */
  private prepareContext(size: PixelSize): CanvasRenderingContext2D | null {
    const context = this.canvas.getContext('2d');
    if (!context) return null;
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.round(size.width * pixelRatio);
    const height = Math.round(size.height * pixelRatio);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    return context;
  }

  /**
   * Draw one frame.
   *
   * Returns:
   *   true if some tiles weren't traced in time (old curves fill those gaps), so the caller
   *   should draw another frame to finish them.
   */
  draw(frame: GraphFrame): boolean {
    const { viewport, size, settings } = frame;
    if (size.width === 0 || size.height === 0) return false;
    const context = this.prepareContext(size);
    if (!context) return false;
    const theme = this.themeFor(settings.textSize);
    drawGrid(context, viewport, size, theme, settings);
    const budget = { deadline: frame.interacting ? performance.now() + GESTURE_TRACE_BUDGET_MS : Infinity };
    let unfinished = false;
    this.drawnCurves = frame.curves.map((curve) => {
      const lookup = this.traceCache.polylinesFor(curve.plot, viewport, size, budget);
      unfinished ||= !lookup.complete;
      drawCurve(context, viewport, size, lookup.polylines, { color: theme.curves[curve.colorIndex], width: theme.curveWidth });
      return { id: curve.id, polylines: lookup.polylines };
    });
    const traced = frame.tracedPoint && frame.curves.find((curve) => curve.id === frame.tracedPoint!.curveId);
    if (traced) drawTracedPoint(context, viewport, size, frame.tracedPoint!.point, theme.curves[traced.colorIndex], theme);
    return unfinished;
  }
}
