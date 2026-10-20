import type { Expr } from '../ast/nodes';
import { MathError } from '../errors';
import { evaluate, type VariableValues } from '../evaluate/evaluate';
import { sampleFunction } from './sampleFunction';
import { traceImplicit } from './traceImplicit';
import type { PixelSize, Plot, Polyline, ViewWindow } from './types';

// Two samples per pixel keeps curves smooth without visible corners.
const SAMPLES_PER_PIXEL = 2;
// Implicit curves cost a value per grid corner, so their grid is coarser than the pixels.
const IMPLICIT_CELL_PIXELS = 4;

/** Float value of `expr` at the given variable values; NaN where it has no real value. */
function valueAt(expr: Expr, values: VariableValues): number {
  try {
    return evaluate(expr, values);
  } catch (error) {
    // A math failure at one point (e.g. a sum that diverges there) just leaves a gap in the curve.
    if (error instanceof MathError) return NaN;
    throw error;
  }
}

function traceExplicit(plot: Extract<Plot, { kind: 'explicit' }>, window: ViewWindow, pixels: PixelSize): Polyline[] {
  const values: VariableValues = {};
  const fn = (input: number) => {
    values[plot.input] = input;
    return valueAt(plot.expr, values);
  };
  if (plot.along === 'horizontal') {
    const runs = sampleFunction(fn, window.xMin, window.xMax, Math.ceil(pixels.width * SAMPLES_PER_PIXEL), window.yMax - window.yMin);
    return runs.map((run) => run.map((sample) => ({ x: sample.input, y: sample.output })));
  }
  const runs = sampleFunction(fn, window.yMin, window.yMax, Math.ceil(pixels.height * SAMPLES_PER_PIXEL), window.xMax - window.xMin);
  return runs.map((run) => run.map((sample) => ({ x: sample.output, y: sample.input })));
}

/**
 * Points to draw for a plot in the visible window, in graph units.
 *
 * Args:
 *   plot: from evaluateGraphWorkspace
 *   window: the visible part of the plane
 *   pixels: the window's size on screen, which sets how finely to sample
 *
 * Returns:
 *   Polylines to stroke; each is one connected piece of the curve.
 */
export function traceCurve(plot: Plot, window: ViewWindow, pixels: PixelSize): Polyline[] {
  if (plot.kind === 'explicit') return traceExplicit(plot, window, pixels);
  const values: VariableValues = {};
  const fn = (x: number, y: number) => {
    values[plot.horizontal] = x;
    values[plot.vertical] = y;
    return valueAt(plot.expr, values);
  };
  const columns = Math.max(1, Math.ceil(pixels.width / IMPLICIT_CELL_PIXELS));
  const rows = Math.max(1, Math.ceil(pixels.height / IMPLICIT_CELL_PIXELS));
  return traceImplicit(fn, window, columns, rows);
}
