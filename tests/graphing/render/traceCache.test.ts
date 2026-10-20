import { describe, expect, test } from 'vitest';
import type { Plot, ViewWindow } from '../../../src/math';
import { TraceCache } from '../../../src/graphing/render/traceCache';
import { homeViewport, panByPixels, visibleWindow, zoomAround } from '../../../src/graphing/state/viewport';

const SIZE = { width: 800, height: 600 };
const VARIABLE_X = { type: 'var', name: 'x' } as const;
const EXPLICIT: Plot = { kind: 'explicit', along: 'horizontal', input: 'x', expr: VARIABLE_X };
const IMPLICIT: Plot = { kind: 'implicit', horizontal: 'x', vertical: 'y', expr: VARIABLE_X };
const NO_LIMIT = { deadline: Infinity };

/** A cache whose tracer records each tile window and pretends each trace takes `costMs`. */
function recordingCache(costMs = 1) {
  const traced: ViewWindow[] = [];
  let clock = 0;
  const cache = new TraceCache(
    (_plot, window) => {
      traced.push(window);
      clock += costMs;
      return [[{ x: window.xMin, y: window.yMin }]];
    },
    () => clock,
  );
  return { cache, traced, clock: () => clock };
}

const covers = (tiles: ViewWindow[], view: ViewWindow) =>
  Math.min(...tiles.map((tile) => tile.xMin)) <= view.xMin &&
  Math.max(...tiles.map((tile) => tile.xMax)) >= view.xMax &&
  Math.min(...tiles.map((tile) => tile.yMin)) <= view.yMin &&
  Math.max(...tiles.map((tile) => tile.yMax)) >= view.yMax;

describe('TraceCache: tracing curves in reusable tiles', () => {
  test('the tiles traced for an implicit curve cover the whole view', () => {
    const { cache, traced } = recordingCache();
    const viewport = homeViewport(SIZE);
    expect(cache.polylinesFor(IMPLICIT, viewport, SIZE, NO_LIMIT).complete).toBe(true);
    expect(covers(traced, visibleWindow(viewport, SIZE))).toBe(true);
  });

  test('redrawing the same view traces nothing new', () => {
    const { cache, traced } = recordingCache();
    const viewport = homeViewport(SIZE);
    cache.polylinesFor(IMPLICIT, viewport, SIZE, NO_LIMIT);
    const firstCount = traced.length;
    cache.polylinesFor(IMPLICIT, viewport, SIZE, NO_LIMIT);
    expect(traced.length).toBe(firstCount);
  });

  test('a drag only traces the newly exposed strip of tiles', () => {
    const { cache, traced } = recordingCache();
    const viewport = homeViewport(SIZE);
    cache.polylinesFor(IMPLICIT, viewport, SIZE, NO_LIMIT);
    const firstCount = traced.length;
    cache.polylinesFor(IMPLICIT, panByPixels(viewport, -150, 0), SIZE, NO_LIMIT);
    const added = traced.length - firstCount;
    // 150px to the right exposes one or two columns of 128px tiles, each ~5 tiles tall.
    expect(added).toBeGreaterThan(0);
    expect(added).toBeLessThanOrEqual(2 * 6);
  });

  test('y = f(x) is traced in vertical strips, so panning up or down needs no new trace', () => {
    const { cache, traced } = recordingCache();
    const viewport = homeViewport(SIZE);
    cache.polylinesFor(EXPLICIT, viewport, SIZE, NO_LIMIT);
    const firstCount = traced.length;
    cache.polylinesFor(EXPLICIT, panByPixels(viewport, 0, 5000), SIZE, NO_LIMIT);
    expect(traced.length).toBe(firstCount);
  });

  test('a small zoom reuses the tiles of the same rounded scale', () => {
    const { cache, traced } = recordingCache();
    const viewport = homeViewport(SIZE);
    cache.polylinesFor(EXPLICIT, viewport, SIZE, NO_LIMIT);
    const firstCount = traced.length;
    cache.polylinesFor(EXPLICIT, zoomAround(viewport, SIZE, 1.02, { x: 400, y: 300 }), SIZE, NO_LIMIT);
    expect(traced.length).toBe(firstCount);
  });

  test('out of time, missing tiles are filled by the last complete curve and reported unfinished', () => {
    const { cache, clock } = recordingCache(5);
    const viewport = homeViewport(SIZE);
    const first = cache.polylinesFor(IMPLICIT, viewport, SIZE, NO_LIMIT);
    const zoomed = zoomAround(viewport, SIZE, 2, { x: 400, y: 300 });
    const partial = cache.polylinesFor(IMPLICIT, zoomed, SIZE, { deadline: clock() + 6 });
    expect(partial.complete).toBe(false);
    // The previous complete curve is still drawn underneath, so nothing disappears.
    expect(partial.polylines.slice(0, first.polylines.length)).toEqual(first.polylines);
    expect(cache.polylinesFor(IMPLICIT, zoomed, SIZE, NO_LIMIT).complete).toBe(true);
  });

  test('a new plot object (an edited line) is traced fresh', () => {
    const { cache, traced } = recordingCache();
    const viewport = homeViewport(SIZE);
    cache.polylinesFor(EXPLICIT, viewport, SIZE, NO_LIMIT);
    const firstCount = traced.length;
    cache.polylinesFor({ ...EXPLICIT }, viewport, SIZE, NO_LIMIT);
    expect(traced.length).toBe(2 * firstCount);
  });
});
