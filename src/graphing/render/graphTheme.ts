// Graph colors come from the shared tokens (src/styles/tokens.css). They're read once and again
// only when the color scheme or text size changes, since getComputedStyle every frame is slow.
import type { TextSize } from '../state/graphSettings';

export const CURVE_COLOR_COUNT = 6;

export interface GraphTheme {
  background: string;
  minorGrid: string;
  majorGrid: string;
  axis: string;
  label: string;
  labelFont: string;
  /** Height of the label font in CSS pixels, for spacing labels from the axes. */
  labelSize: number;
  /** The axis names typed in the settings (x, time...). */
  axisNameFont: string;
  curveWidth: number;
  curves: string[];
}

// Large text (the A A switch) also thickens curves so the graph reads from a distance.
const SIZES: Record<TextSize, { label: number; axisName: number; curveWidth: number }> = {
  normal: { label: 13, axisName: 17, curveWidth: 2.5 },
  large: { label: 17, axisName: 22, curveWidth: 3.5 },
};

/** Each line keeps its color while others are added or removed, because it follows the line's id. */
export function curveColorIndex(lineId: number): number {
  return lineId % CURVE_COLOR_COUNT;
}

/** The CSS variable for a curve color, for use in markup (the row's color swatch). */
export function curveColorVariable(lineId: number): string {
  return `var(--color-graph-${curveColorIndex(lineId) + 1})`;
}

export function readGraphTheme(element: Element, textSize: TextSize): GraphTheme {
  const styles = getComputedStyle(element);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  const sizes = SIZES[textSize];
  return {
    background: token('--color-graph-bg'),
    minorGrid: token('--color-graph-grid-minor'),
    majorGrid: token('--color-graph-grid-major'),
    axis: token('--color-graph-axis'),
    label: token('--color-graph-label'),
    labelFont: `500 ${sizes.label}px ${token('--font-ui')}`,
    labelSize: sizes.label,
    axisNameFont: `italic ${sizes.axisName}px ${token('--font-math')}`,
    curveWidth: sizes.curveWidth,
    curves: Array.from({ length: CURVE_COLOR_COUNT }, (_, index) => token(`--color-graph-${index + 1}`)),
  };
}
