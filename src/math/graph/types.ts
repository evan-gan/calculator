import type { Expr } from '../ast/nodes';
import type { LineResult } from '../workspace/types';

/**
 * Which variables run along each screen axis. The app graphs x and y today; keeping the names
 * in one value lets it graph other pairs (t and s, θ and r...) without touching the math.
 */
export interface GraphAxes {
  horizontal: string;
  vertical: string;
}

export const DEFAULT_AXES: GraphAxes = { horizontal: 'x', vertical: 'y' };

/**
 * Something that can be drawn.
 * - explicit: one axis variable as a function of the other (`y = x²`, or `x = sin y` with
 *   `along: 'vertical'`, meaning the input runs up the screen).
 * - implicit: every point where `expr` (left − right of the equation) is zero (`x² + y² = 25`).
 * Expressions are already simplified, with other lines' definitions substituted.
 */
export type Plot =
  | { kind: 'explicit'; along: 'horizontal' | 'vertical'; input: string; expr: Expr }
  | { kind: 'implicit'; horizontal: string; vertical: string; expr: Expr };

/** The rectangle of the plane on screen, in graph units. */
export interface ViewWindow {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** How many screen pixels the window covers; sampling density follows it. */
export interface PixelSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A connected run of points to draw as one stroke. */
export type Polyline = Point[];

/** A workspace line's result plus what to draw for it (null when it isn't a graph). */
export interface GraphLineResult extends LineResult {
  plot: Plot | null;
}
