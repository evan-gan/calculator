import type { Plot } from '../math';

/** One curve to draw: its plot and which of the theme's curve colors to use. */
export interface GraphCurve {
  id: number;
  colorIndex: number;
  plot: Plot;
}
