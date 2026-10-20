/** Spacing of labelled (major) and faint (minor) gridlines, in graph units. */
export interface GridSteps {
  major: number;
  minor: number;
}

// Major gridlines at least this far apart on screen, so their labels don't crowd.
const MIN_MAJOR_PIXELS = 90;
// A typed step is labelled every line down to this spacing; closer than that, every 2nd/5th/10th...
const MIN_CUSTOM_MAJOR_PIXELS = 40;
// Minor lines closer than this would just grey out the background.
const MIN_MINOR_PIXELS = 6;

/**
 * Choose gridline spacing from the 1, 2, 5 × 10ⁿ sequence, like graph paper.
 * Minor lines split a major step into 5 (or 4 when it starts with 2, so they land on whole numbers).
 */
export function gridSteps(unitsPerPixel: number, minMajorPixels = MIN_MAJOR_PIXELS): GridSteps {
  const minimumStep = unitsPerPixel * minMajorPixels;
  const power = 10 ** Math.floor(Math.log10(minimumStep));
  for (const multiple of [1, 2, 5, 10]) {
    const major = multiple * power;
    if (major >= minimumStep) return { major, minor: major / (multiple === 2 ? 4 : 5) };
  }
  return { major: 10 * power, minor: 2 * power };
}

/**
 * Gridlines for a step typed in the settings. The step is kept as the minor spacing, and major
 * (labelled) lines fall on a 1, 2, 5, 10... multiple of it so labels never crowd when zoomed out.
 * Returns null when even the minor lines would be too dense to draw (then automatic steps apply).
 */
export function customGridSteps(step: number, unitsPerPixel: number): GridSteps | null {
  if (!(step > 0) || step / unitsPerPixel < MIN_MINOR_PIXELS) return null;
  for (let power = 1; ; power *= 10) {
    for (const multiple of [1, 2, 5]) {
      const major = step * multiple * power;
      if (major / unitsPerPixel >= MIN_CUSTOM_MAJOR_PIXELS) {
        const minor = major === step ? step / (multiple === 2 ? 4 : 5) : step;
        return { major, minor: minor / unitsPerPixel >= MIN_MINOR_PIXELS ? minor : major };
      }
    }
  }
}

/**
 * Decimal places that show a multiple of `step` without noise: 0.25 → 2, 5 → 0. A step that
 * isn't a short decimal (like π) gets three more places than its size alone suggests.
 */
function decimalsForStep(step: number): number {
  const base = Math.max(0, -Math.floor(Math.log10(step)));
  for (let decimals = base; decimals < base + 3; decimals++) {
    const scaled = step * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6 * scaled) return decimals;
  }
  return base + 3;
}

/**
 * Axis label for a gridline value, without float noise (0.30000000000000004 → "0.3").
 * Very large or very small values use scientific notation.
 */
export function formatTick(value: number, step: number): string {
  if (Math.abs(value) < step / 2) return '0';
  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || step < 1e-4) {
    const significant = Math.max(1, Math.ceil(Math.log10(magnitude / step)) + 1);
    const exponential = value.toExponential(Math.min(significant - 1, 10));
    return withMinusSigns(exponential.replace('e+', 'e').replace(/\.?0+e/, 'e'));
  }
  return withMinusSigns(value.toFixed(decimalsForStep(step)));
}

/**
 * A traced point's coordinate, precise to about a tenth of a pixel at the current zoom,
 * without trailing zeros (1.250 → 1.25).
 */
export function formatCoordinate(value: number, unitsPerPixel: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e6 || (magnitude > 0 && magnitude < 1e-4 && unitsPerPixel < 1e-5)) {
    return withMinusSigns(value.toExponential(4).replace('e+', 'e').replace(/\.?0+e/, 'e'));
  }
  const decimals = Math.min(10, Math.max(0, Math.ceil(-Math.log10(unitsPerPixel)) + 1));
  const text = value.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return withMinusSigns(text === '-0' ? '0' : text);
}

/** An axis range end for the settings boxes: six significant figures (−8.44456). */
export function formatRangeValue(value: number): string {
  return withMinusSigns(String(Number(value.toPrecision(6))));
}

/** A typographic minus (−) reads better than a hyphen next to numbers. */
function withMinusSigns(text: string): string {
  return text.replaceAll('-', '−');
}
