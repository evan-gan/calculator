// Float estimates of one-sided limits, for checking exact answers and for the ≈ fallback.
// f is sampled at distances t = t₀/2^k from the point (or at x = ±1/t towards ±∞), and the
// samples are extrapolated to t = 0 with Richardson's method, which removes error terms in
// t, t², … one at a time. The estimate whose neighbours agree best is kept.

const START_DISTANCE = 0.05;
// Down to t ≈ 1.5e-6: closer than that, cancellation in things like eˣ - 1 - x turns samples into noise.
const SAMPLE_COUNT = 16;
const MAX_EXTRAPOLATION = 6;
// Accepted when neighbouring estimates agree to this (relative to the value, or absolute near 0).
const AGREEMENT = 1e-7;
// Samples that grow steadily by at least this factor over the last 8 halvings count as going to ±∞
// (1/x grows by 256; anything settling on a finite value grows by far less).
const DIVERGENCE_GROWTH = 100;

export type Sampler = (x: number) => number;

/** x at distance t from the point, on the given side; x = ±1/t for a limit at ±∞. */
export function pointAtDistance(point: number, direction: 1 | -1, distance: number): number {
  if (!Number.isFinite(point)) return direction / distance;
  return point + direction * distance * Math.max(1, Math.abs(point));
}

function samplesTowards(f: Sampler, point: number, direction: 1 | -1): number[] {
  return Array.from({ length: SAMPLE_COUNT }, (_, k) => f(pointAtDistance(point, direction, START_DISTANCE / 2 ** k)));
}

/** ±Infinity when the last samples keep one sign and grow steadily by DIVERGENCE_GROWTH or more. */
function divergence(samples: number[]): number | null {
  const tail = samples.slice(-8);
  const sign = Math.sign(tail[0]);
  const grows = tail.every((value, index) => Math.sign(value) === sign && (index === 0 || Math.abs(value) >= Math.abs(tail[index - 1])));
  return grows && sign !== 0 && Math.abs(tail[tail.length - 1]) >= DIVERGENCE_GROWTH * Math.abs(tail[0]) ? sign * Infinity : null;
}

/**
 * Richardson table: row k holds sample k extrapolated 0…min(k, MAX) times. An entry's error is
 * the larger of its differences from the two entries above it, so a single chance agreement
 * among noisy samples isn't trusted.
 */
function bestExtrapolation(samples: number[]): { value: number; error: number } | null {
  const rows: number[][] = [];
  let best: { value: number; error: number } | null = null;
  for (const sample of samples) {
    const previous = rows[rows.length - 1] ?? [];
    const row = [sample];
    for (let level = 1; level <= Math.min(previous.length, MAX_EXTRAPOLATION); level++) {
      row.push(row[level - 1] + (row[level - 1] - previous[level - 1]) / (2 ** level - 1));
    }
    const beforePrevious = rows[rows.length - 2] ?? [];
    for (let level = 0; level < Math.min(row.length, beforePrevious.length); level++) {
      const error = Math.max(Math.abs(row[level] - previous[level]), Math.abs(previous[level] - beforePrevious[level]));
      if (Number.isFinite(error) && (!best || error < best.error)) best = { value: row[level], error };
    }
    rows.push(row);
  }
  return best;
}

/**
 * The samples worth extrapolating. Extrapolation needs evenly halving distances, so this is
 * one unbroken run: it starts after the last non-finite sample and stops at the first exact 0
 * that follows a non-zero sample. Such a 0 is cancellation, not the function: for tiny x,
 * sin(tan x) and tan(sin x) round to the same float, so their difference comes out exactly 0.
 */
function trustworthyRun(samples: number[]): number[] {
  let start = samples.length;
  while (start > 0 && Number.isFinite(samples[start - 1])) start--;
  let end = start;
  while (end < samples.length && !(samples[end] === 0 && end > start && samples[end - 1] !== 0)) end++;
  return samples.slice(start, end);
}

/**
 * Estimate of lim f(x) as x approaches `point` (a number or ±Infinity) from one side.
 * Returns a number, ±Infinity, or null when the samples don't settle (oscillation, too slow,
 * or f undefined there).
 */
export function numericLimit(f: Sampler, point: number, direction: 1 | -1): number | null {
  const samples = samplesTowards(f, point, direction);
  if (samples.slice(-SAMPLE_COUNT / 2).some((value) => Number.isNaN(value))) return null;
  const diverging = divergence(samples);
  if (diverging !== null) return diverging;
  const best = bestExtrapolation(trustworthyRun(samples));
  if (!best || best.error > AGREEMENT * Math.max(1, Math.abs(best.value))) return null;
  return Math.abs(best.value) < AGREEMENT ? 0 : best.value;
}

/**
 * True when f has a value at some points just to one side of the point. Towards ±∞ the nearer
 * distances are huge x where eˣ - e^(x-1) is ∞ - ∞ = NaN in floats, so moderate ones come first.
 */
export function isDefinedNear(f: Sampler, point: number, direction: 1 | -1): boolean {
  return [1e-2, 1e-3, 1e-5, 1e-7].some((distance) => !Number.isNaN(f(pointAtDistance(point, direction, distance))));
}
