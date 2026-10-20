// Small canvas helpers shared by the cartesian grid, the polar grid and the axes.

/** Graph values of every gridline `step` apart inside [min, max]. */
export function gridValues(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let index = Math.ceil(min / step); index * step <= max; index++) values.push(index * step);
  return values;
}

/** Stroke everything `draw` adds to the path in one call (much faster than a stroke per line). */
export function strokeLines(context: CanvasRenderingContext2D, color: string, width: number, draw: () => void): void {
  context.beginPath();
  draw();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

/** Half-pixel offset keeps 1px lines crisp instead of blurred across two pixels. */
export function crispPixel(value: number): number {
  return Math.round(value) + 0.5;
}
