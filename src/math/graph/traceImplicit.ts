import type { Point, Polyline, ViewWindow } from './types';

/** A real function of two variables; NaN or ±Infinity where it has no real value. */
export type PlaneFunction = (x: number, y: number) => number;

interface GridValues {
  values: Float64Array;
  columns: number;
  rows: number;
  xAt: (column: number) => number;
  yAt: (row: number) => number;
  at: (column: number, row: number) => number;
}

function sampleGrid(fn: PlaneFunction, window: ViewWindow, columns: number, rows: number): GridValues {
  const xAt = (column: number) => window.xMin + ((window.xMax - window.xMin) * column) / columns;
  const yAt = (row: number) => window.yMin + ((window.yMax - window.yMin) * row) / rows;
  const values = new Float64Array((columns + 1) * (rows + 1));
  for (let row = 0; row <= rows; row++) {
    for (let column = 0; column <= columns; column++) values[row * (columns + 1) + column] = fn(xAt(column), yAt(row));
  }
  return { values, columns, rows, xAt, yAt, at: (column, row) => values[row * (columns + 1) + column] };
}

/**
 * Where the curve crosses the edge from `from` to `to` (linear interpolation), or null.
 * A sign change through a pole (1/y around y = 0) isn't a zero: the function at the crossing
 * is then larger than at both ends, so that crossing is rejected.
 */
function edgeCrossing(fn: PlaneFunction, from: Point, fromValue: number, to: Point, toValue: number): Point | null {
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue)) return null;
  if (fromValue > 0 === toValue > 0) return null;
  const share = fromValue / (fromValue - toValue);
  const crossing = { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
  const valueThere = fn(crossing.x, crossing.y);
  if (!Number.isFinite(valueThere) || Math.abs(valueThere) > Math.max(Math.abs(fromValue), Math.abs(toValue))) return null;
  return crossing;
}

/**
 * Crossings on every grid edge, computed once since neighbouring cells share edges.
 * `horizontal[row][column]` is the edge from (column, row) to (column + 1, row);
 * `vertical[row][column]` is the edge from (column, row) to (column, row + 1).
 */
function findEdgeCrossings(fn: PlaneFunction, grid: GridValues) {
  const point = (column: number, row: number): Point => ({ x: grid.xAt(column), y: grid.yAt(row) });
  const crossing = (fromColumn: number, fromRow: number, toColumn: number, toRow: number) =>
    edgeCrossing(fn, point(fromColumn, fromRow), grid.at(fromColumn, fromRow), point(toColumn, toRow), grid.at(toColumn, toRow));
  const horizontal: (Point | null)[][] = [];
  const vertical: (Point | null)[][] = [];
  for (let row = 0; row <= grid.rows; row++) {
    horizontal.push([]);
    vertical.push([]);
    for (let column = 0; column <= grid.columns; column++) {
      horizontal[row].push(column < grid.columns ? crossing(column, row, column + 1, row) : null);
      vertical[row].push(row < grid.rows ? crossing(column, row, column, row + 1) : null);
    }
  }
  return { horizontal, vertical };
}

/**
 * Segments inside one cell. Edges are numbered bottom, right, top, left. With four crossings
 * (a saddle) the value at the centre decides which corners the curve separates.
 */
function cellSegments(fn: PlaneFunction, grid: GridValues, edges: (Point | null)[], column: number, row: number): Polyline[] {
  const present = edges.filter((edge): edge is Point => edge !== null);
  if (present.length < 2) return [];
  if (present.length < 4) return [[present[0], present[1]]];
  const [bottom, right, top, left] = edges as Point[];
  const centreValue = fn((grid.xAt(column) + grid.xAt(column + 1)) / 2, (grid.yAt(row) + grid.yAt(row + 1)) / 2);
  const centreSameAsBottomLeft = centreValue > 0 === grid.at(column, row) > 0;
  return centreSameAsBottomLeft
    ? [
        [bottom, right],
        [top, left],
      ]
    : [
        [left, bottom],
        [right, top],
      ];
}

/**
 * Trace the curve fn(x, y) = 0 inside the window with marching squares.
 *
 * Args:
 *   fn: the function whose zero set is drawn (left − right of the equation)
 *   window: the visible part of the plane
 *   columns, rows: grid cells across and up; more cells give a finer curve
 *
 * Returns:
 *   Short line segments that together make up the curve. Touching zero without changing
 *   sign (like (x − y)² = 0) isn't detected.
 */
export function traceImplicit(fn: PlaneFunction, window: ViewWindow, columns: number, rows: number): Polyline[] {
  const grid = sampleGrid(fn, window, columns, rows);
  const { horizontal, vertical } = findEdgeCrossings(fn, grid);
  const segments: Polyline[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const edges = [horizontal[row][column], vertical[row][column + 1], horizontal[row + 1][column], vertical[row][column]];
      segments.push(...cellSegments(fn, grid, edges, column, row));
    }
  }
  return segments;
}
