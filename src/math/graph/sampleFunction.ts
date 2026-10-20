/** A real function of one variable; NaN or ±Infinity where it has no real value. */
export type RealFunction = (input: number) => number;

export interface Sample {
  input: number;
  output: number;
}

// A change bigger than this share of the visible output range between neighbouring samples
// is checked for a discontinuity, so a pole or jump isn't drawn as a steep connecting line.
const JUMP_SHARE_OF_VIEW = 0.05;
// Halving a sample interval 40 times narrows it by ~10¹², far below anything visible.
const BISECTION_STEPS = 40;

const isDefined = (sample: Sample) => Number.isFinite(sample.output);

function sampleAt(fn: RealFunction, input: number): Sample {
  return { input, output: fn(input) };
}

/**
 * The defined point closest to where the function stops being defined between `defined` and
 * `undefinedSample`, so √(1 − x²) reaches the axis instead of stopping a sample short.
 */
function domainEdge(fn: RealFunction, defined: Sample, undefinedSample: Sample): Sample {
  let inside = defined;
  let outside = undefinedSample;
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = sampleAt(fn, (inside.input + outside.input) / 2);
    if (isDefined(middle)) inside = middle;
    else outside = middle;
  }
  return inside;
}

/**
 * Whether the function breaks between two defined samples. A continuous function's change
 * shrinks as the interval is halved; across a pole or jump the half containing it keeps the
 * whole change however small it gets.
 */
function breaksBetween(fn: RealFunction, first: Sample, second: Sample, threshold: number): boolean {
  let low = first;
  let high = second;
  for (let step = 0; step < BISECTION_STEPS; step++) {
    if (Math.abs(high.output - low.output) <= threshold) return false;
    const middle = sampleAt(fn, (low.input + high.input) / 2);
    if (!isDefined(middle)) return true;
    const lowerChange = Math.abs(middle.output - low.output);
    const upperChange = Math.abs(high.output - middle.output);
    if (lowerChange >= upperChange) high = middle;
    else low = middle;
  }
  return true;
}

/**
 * Sample a function evenly over [start, end] and split the samples into connected runs,
 * breaking where it is undefined and at poles and jumps.
 *
 * Args:
 *   fn: the function to sample
 *   start, end: input range
 *   sampleCount: number of intervals (sampleCount + 1 samples)
 *   outputSpan: height of the visible output range, which sets what counts as a jump
 *
 * Returns:
 *   Runs of samples, each to be drawn as one connected line.
 */
export function sampleFunction(
  fn: RealFunction,
  start: number,
  end: number,
  sampleCount: number,
  outputSpan: number,
): Sample[][] {
  const threshold = outputSpan * JUMP_SHARE_OF_VIEW;
  const runs: Sample[][] = [];
  let run: Sample[] = [];
  const finishRun = () => {
    if (run.length > 0) runs.push(run);
    run = [];
  };

  let previous: Sample | null = null;
  for (let index = 0; index <= sampleCount; index++) {
    const current = sampleAt(fn, start + ((end - start) * index) / sampleCount);
    if (previous) {
      if (isDefined(previous) && !isDefined(current)) {
        run.push(domainEdge(fn, previous, current));
        finishRun();
      } else if (!isDefined(previous) && isDefined(current)) {
        run.push(domainEdge(fn, current, previous));
      } else if (isDefined(previous) && isDefined(current) && breaksBetween(fn, previous, current, threshold)) {
        finishRun();
      }
    }
    if (isDefined(current)) run.push(current);
    previous = current;
  }
  finishRun();
  return runs;
}
