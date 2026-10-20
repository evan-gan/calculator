<script lang="ts">
  import { onMount } from 'svelte';
  import ControlButton from './ControlButton.svelte';
  import ZoomControls from './ZoomControls.svelte';
  import GraphSettingsMenu from './settings/GraphSettingsMenu.svelte';
  import type { AngleMode, PixelSize, Point, ViewWindow } from '../../math';
  import { GraphRenderer } from '../render/graphRenderer';
  import type { GraphSettings } from '../state/graphSettings';
  import { nearestCurvePoint, type CurveHit } from '../state/nearestPoint';
  import { PointerGesture } from '../state/pointerGesture';
  import { homeViewport, viewportForWindow, visibleWindow, zoomAround, type Viewport } from '../state/viewport';
  import type { GraphCurve } from '../types';

  interface Props {
    curves: GraphCurve[];
    settings: GraphSettings;
    angleMode: AngleMode;
  }

  let { curves, settings = $bindable(), angleMode = $bindable() }: Props = $props();

  const BUTTON_ZOOM_FACTOR = 1.5;
  // Wheel deltas are in pixels (or lines, ~16px each); this makes one notch zoom about 20%.
  const WHEEL_ZOOM_PER_PIXEL = 0.002;
  const PIXELS_PER_WHEEL_LINE = 16;
  // How close the pointer must be to a curve to trace it; fingers are less precise than a mouse.
  const MOUSE_REACH_PIXELS = 8;
  const TOUCH_REACH_PIXELS = 20;
  // A pan or zoom this recent counts as still moving, so tracing keeps to a per-frame time budget.
  const GESTURE_IDLE_MS = 150;

  let container: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let renderer: GraphRenderer | null = null;
  let size = $state<PixelSize>({ width: 0, height: 0 });
  let viewport = $state<Viewport | null>(null);
  let menuOpen = $state(false);
  // The point shown while a curve is held, and the pointer holding it.
  let tracedPoint = $state.raw<{ curveId: number; point: Point } | null>(null);
  let tracingPointerId: number | null = null;
  let overCurve = $state(false);
  const gesture = new PointerGesture();
  let lastViewChange = 0;

  const currentWindow = $derived<ViewWindow>(viewport ? visibleWindow(viewport, size) : { xMin: -10, xMax: 10, yMin: -10, yMax: 10 });

  // Redraw at most once per frame however many pan/zoom events arrive.
  let frameRequest = 0;
  function requestRender(): void {
    cancelAnimationFrame(frameRequest);
    frameRequest = requestAnimationFrame(render);
  }

  function render(): void {
    if (!renderer || !viewport) return;
    const interacting = performance.now() - lastViewChange < GESTURE_IDLE_MS;
    const unfinished = renderer.draw({ viewport, size, curves, settings, tracedPoint, interacting });
    // Keep tracing the remaining tiles on the next frames, even if the pointer has stopped.
    if (unfinished) requestRender();
  }

  $effect(() => {
    // Read everything the drawing depends on (settings deeply) so this reruns when any of it changes.
    void [viewport, size.width, size.height, curves, tracedPoint, $state.snapshot(settings)];
    requestRender();
  });

  /** Pan/zoom from the pointer or wheel: ignored while the viewport is locked. */
  function moveView(next: Viewport): void {
    if (settings.lockViewport) return;
    viewport = next;
    lastViewChange = performance.now();
  }

  function showWindow(window: ViewWindow): boolean {
    const next = viewportForWindow(window, size);
    if (next) viewport = next;
    return next !== null;
  }

  function pointerPosition(event: PointerEvent | WheelEvent): Point {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function curveHitAt(pixel: Point, reach: number, onlyCurveId: number | null = null): CurveHit | null {
    if (!renderer || !viewport) return null;
    return nearestCurvePoint(renderer.drawnCurves, pixel, viewport, size, reach, onlyCurveId);
  }

  const reachFor = (event: PointerEvent) => (event.pointerType === 'mouse' ? MOUSE_REACH_PIXELS : TOUCH_REACH_PIXELS);

  function handlePointerDown(event: PointerEvent): void {
    menuOpen = false;
    canvas.setPointerCapture(event.pointerId);
    const pixel = pointerPosition(event);
    // Pressing on a curve traces it instead of starting a drag.
    if (!gesture.active && tracingPointerId === null) {
      const hit = curveHitAt(pixel, reachFor(event));
      if (hit) {
        tracingPointerId = event.pointerId;
        tracedPoint = { curveId: hit.curveId, point: hit.point };
        return;
      }
    }
    if (tracingPointerId === null) gesture.down(event.pointerId, pixel);
  }

  function handlePointerMove(event: PointerEvent): void {
    const pixel = pointerPosition(event);
    if (event.pointerId === tracingPointerId && tracedPoint) {
      // Stick to the held curve however far the pointer strays from it.
      const hit = curveHitAt(pixel, Infinity, tracedPoint.curveId);
      if (hit) tracedPoint = { curveId: hit.curveId, point: hit.point };
    } else if (gesture.active && viewport) {
      moveView(gesture.move(event.pointerId, pixel, viewport, size));
    } else if (event.pointerType === 'mouse') {
      overCurve = curveHitAt(pixel, MOUSE_REACH_PIXELS) !== null;
    }
  }

  function handlePointerEnd(event: PointerEvent): void {
    if (event.pointerId === tracingPointerId) {
      tracingPointerId = null;
      tracedPoint = null;
    } else {
      gesture.up(event.pointerId);
    }
  }

  function zoomAtCenter(factor: number): void {
    if (viewport) moveView(zoomAround(viewport, size, factor, { x: size.width / 2, y: size.height / 2 }));
  }

  function handleWheel(event: WheelEvent): void {
    if (!viewport) return;
    // Otherwise the page would scroll as well as the graph zooming.
    event.preventDefault();
    const deltaPixels = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * PIXELS_PER_WHEEL_LINE : event.deltaY;
    moveView(zoomAround(viewport, size, Math.exp(-deltaPixels * WHEEL_ZOOM_PER_PIXEL), pointerPosition(event)));
  }

  function handleWindowKeydown(event: KeyboardEvent): void {
    if (menuOpen && event.key === 'Escape') menuOpen = false;
  }

  onMount(() => {
    renderer = new GraphRenderer(canvas);
    const resizeObserver = new ResizeObserver(([entry]) => {
      size = { width: entry.contentRect.width, height: entry.contentRect.height };
      viewport ??= homeViewport(size);
    });
    resizeObserver.observe(container);
    // Svelte's onwheel is passive, which can't preventDefault, so this listener is added by hand.
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    const colorScheme = matchMedia('(prefers-color-scheme: dark)');
    const onSchemeChange = () => {
      renderer?.invalidateTheme();
      requestRender();
    };
    colorScheme.addEventListener('change', onSchemeChange);
    return () => {
      resizeObserver.disconnect();
      canvas.removeEventListener('wheel', handleWheel);
      colorScheme.removeEventListener('change', onSchemeChange);
      cancelAnimationFrame(frameRequest);
    };
  });
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="graph-canvas" bind:this={container}>
  <canvas
    bind:this={canvas}
    class:on-curve={overCurve || tracedPoint !== null}
    class:locked={settings.lockViewport}
    aria-label="Graph. Drag to pan, scroll or pinch to zoom, press on a curve to see a point's coordinates."
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerEnd}
    onpointercancel={handlePointerEnd}
    onpointerleave={() => (overCurve = false)}
  ></canvas>
  <div class="controls">
    <ControlButton label="Graph settings" pressed={menuOpen} onClick={() => (menuOpen = !menuOpen)}>
      <path
        d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      />
    </ControlButton>
    <ZoomControls
      disabled={settings.lockViewport}
      onZoomIn={() => zoomAtCenter(BUTTON_ZOOM_FACTOR)}
      onZoomOut={() => zoomAtCenter(1 / BUTTON_ZOOM_FACTOR)}
      onReset={() => (viewport = homeViewport(size))}
    />
    {#if menuOpen}
      <div class="menu" style:max-height={`${Math.max(160, size.height - 24)}px`}>
        <GraphSettingsMenu bind:settings bind:angleMode window={currentWindow} onWindowChange={showWindow} />
      </div>
    {/if}
  </div>
</div>

<style>
  .graph-canvas {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--color-graph-bg);
  }

  canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    /* The canvas handles drags and pinches itself instead of the browser scrolling or zooming. */
    touch-action: none;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  /* Over a curve (or holding one) the pointer is a plain arrow: pressing traces instead of dragging. */
  canvas.on-curve,
  canvas.locked {
    cursor: default;
  }

  .controls {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .menu {
    position: absolute;
    top: 0;
    right: calc(100% + var(--space-2));
    display: flex;
  }
</style>
