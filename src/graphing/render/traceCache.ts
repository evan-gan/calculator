import { traceCurve, type PixelSize, type Plot, type Polyline, type ViewWindow } from '../../math';
import { visibleWindow, type Viewport } from '../state/viewport';

export interface TraceLookup {
  polylines: Polyline[];
  /** False when some tiles ran out of time this frame; the caller should draw another frame soon. */
  complete: boolean;
}

/** Shared by every curve in one frame: tracing stops starting new tiles after this time. */
export interface TraceBudget {
  deadline: number;
}

// Tiles are squares this many pixels wide for implicit curves (32 × 32 cells of 4px each) and
// strips this wide for y = f(x). Small enough that a drag only traces a thin new strip each frame.
const IMPLICIT_TILE_PIXELS = 128;
const EXPLICIT_TILE_PIXELS = 256;
// Scales are rounded to steps of 2^(1/4) (~19%), so a smooth zoom keeps reusing tiles for a while
// (drawn up to ~9% larger or smaller than traced, which isn't visible) instead of retracing each frame.
const LEVELS_PER_DOUBLING = 4;
// Old tiles are dropped beyond this many per curve to bound memory.
const MAX_TILES_PER_PLOT = 600;

interface TileGrid {
  /** Tile size in graph units; Infinity along an axis the tiles don't split (y = f(x) strips). */
  width: number;
  height: number;
  /** Pixels per tile at the rounded scale, which sets how finely each tile is traced. */
  pixels: PixelSize;
  /** For y = f(x): output range that counts as one screen height (decides what's a jump). */
  outputSpan: number;
  keyPrefix: string;
}

const scaleLevel = (unitsPerPixel: number) => Math.round(Math.log2(unitsPerPixel) * LEVELS_PER_DOUBLING);
const levelScale = (level: number) => 2 ** (level / LEVELS_PER_DOUBLING);

function tileGrid(plot: Plot, viewport: Viewport, size: PixelSize): TileGrid {
  const levelX = scaleLevel(viewport.unitsPerPixelX);
  const levelY = scaleLevel(viewport.unitsPerPixelY);
  const scaleX = levelScale(levelX);
  const scaleY = levelScale(levelY);
  const keyPrefix = `${levelX},${levelY},${Math.round(size.width)},${Math.round(size.height)}`;
  if (plot.kind === 'implicit') {
    const pixels = { width: IMPLICIT_TILE_PIXELS, height: IMPLICIT_TILE_PIXELS };
    return { width: IMPLICIT_TILE_PIXELS * scaleX, height: IMPLICIT_TILE_PIXELS * scaleY, pixels, outputSpan: 0, keyPrefix };
  }
  if (plot.along === 'horizontal') {
    const pixels = { width: EXPLICIT_TILE_PIXELS, height: size.height };
    return { width: EXPLICIT_TILE_PIXELS * scaleX, height: Infinity, pixels, outputSpan: size.height * scaleY, keyPrefix };
  }
  const pixels = { width: size.width, height: EXPLICIT_TILE_PIXELS };
  return { width: Infinity, height: EXPLICIT_TILE_PIXELS * scaleY, pixels, outputSpan: size.width * scaleX, keyPrefix };
}

/** Index range of the tiles covering [min, max] along one axis (a single tile when unsplit). */
function tileRange(min: number, max: number, tileSize: number): [number, number] {
  return Number.isFinite(tileSize) ? [Math.floor(min / tileSize), Math.floor(max / tileSize)] : [0, 0];
}

/**
 * The window a tile covers. Along an unsplit axis of y = f(x), the window's height only tells
 * the tracer how large a jump must be to count as a break, so it's set to one screen's worth.
 */
function tileWindow(grid: TileGrid, column: number, row: number): ViewWindow {
  const xMin = Number.isFinite(grid.width) ? column * grid.width : 0;
  const yMin = Number.isFinite(grid.height) ? row * grid.height : 0;
  return {
    xMin,
    xMax: Number.isFinite(grid.width) ? (column + 1) * grid.width : grid.outputSpan,
    yMin,
    yMax: Number.isFinite(grid.height) ? (row + 1) * grid.height : grid.outputSpan,
  };
}

interface PlotTiles {
  plot: Plot;
  tiles: Map<string, Polyline[]>;
  /** Everything drawn by the last frame that had every tile, shown under gaps while tiles catch up. */
  lastComplete: Polyline[];
}

/**
 * Traces curves in fixed tiles of the plane and remembers them, so redraws don't re-evaluate the
 * math: a drag only traces the tiles that just came on screen, and a zoom reuses tiles until the
 * scale moves to the next rounded level. During a gesture tracing stops at the frame's time
 * budget; tiles not ready yet are covered by the last complete frame's curve and finished on
 * the following frames. Entries are keyed by the plot object, so editing a line retraces it.
 */
export class TraceCache {
  private readonly entries = new WeakMap<Plot, PlotTiles>();

  constructor(
    private readonly trace: typeof traceCurve = traceCurve,
    private readonly now: () => number = () => performance.now(),
  ) {}

  polylinesFor(plot: Plot, viewport: Viewport, size: PixelSize, budget: TraceBudget): TraceLookup {
    const entry = this.entryFor(plot);
    const grid = tileGrid(plot, viewport, size);
    const view = visibleWindow(viewport, size);
    const [firstColumn, lastColumn] = tileRange(view.xMin, view.xMax, grid.width);
    const [firstRow, lastRow] = tileRange(view.yMin, view.yMax, grid.height);
    const polylines: Polyline[] = [];
    let complete = true;
    for (let row = firstRow; row <= lastRow; row++) {
      for (let column = firstColumn; column <= lastColumn; column++) {
        const tile = this.tileFor(entry, grid, column, row, budget);
        if (tile) polylines.push(...tile);
        else complete = false;
      }
    }
    if (complete) {
      entry.lastComplete = polylines;
      return { polylines, complete };
    }
    return { polylines: [...entry.lastComplete, ...polylines], complete };
  }

  private entryFor(plot: Plot): PlotTiles {
    let entry = this.entries.get(plot);
    if (!entry) {
      entry = { plot, tiles: new Map(), lastComplete: [] };
      this.entries.set(plot, entry);
    }
    return entry;
  }

  /** A cached tile, or a freshly traced one if there's time left; null when out of time. */
  private tileFor(entry: PlotTiles, grid: TileGrid, column: number, row: number, budget: TraceBudget): Polyline[] | null {
    const key = `${grid.keyPrefix}:${column},${row}`;
    const cached = entry.tiles.get(key);
    if (cached) return cached;
    if (this.now() >= budget.deadline) return null;
    const traced = this.trace(entry.plot, tileWindow(grid, column, row), grid.pixels);
    entry.tiles.set(key, traced);
    if (entry.tiles.size > MAX_TILES_PER_PLOT) entry.tiles.delete(entry.tiles.keys().next().value!);
    return traced;
  }
}
