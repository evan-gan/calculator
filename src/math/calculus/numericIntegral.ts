// Numeric integration for definite integrals without an exact antiderivative, and for
// checking exact answers. Adaptive Gauss–Legendre: each piece is split in half until the
// halves agree with the whole. The rule never samples the ends of a piece, so integrable
// endpoint singularities like 1/√x on [0, 1] are fine; divergent ones never settle and fail.

const GAUSS_NODES = [0, -0.5384693101056831, 0.5384693101056831, -0.906179845938664, 0.906179845938664];
const GAUSS_WEIGHTS = [0.5688888888888889, 0.4786286704993665, 0.4786286704993665, 0.2369268850561891, 0.2369268850561891];

const RELATIVE_TOLERANCE = 1e-13;
const MAX_DEPTH = 60;
const MAX_PIECES = 20000;
// At the depth limit a piece is still accepted if its error is this small (integrable singularities converge slowly).
const DEPTH_LIMIT_TOLERANCE = 1e-7;

type RealFunction = (x: number) => number;

function gaussRule(fn: RealFunction, start: number, end: number): number {
  const half = (end - start) / 2;
  const middle = (start + end) / 2;
  let total = 0;
  for (let index = 0; index < GAUSS_NODES.length; index++) total += GAUSS_WEIGHTS[index] * fn(middle + half * GAUSS_NODES[index]);
  return total * half;
}

type Piece = { start: number; end: number; estimate: number; depth: number };

/** ∫ fn over a finite [start, end], or null if it doesn't converge. */
function adaptiveIntegral(fn: RealFunction, start: number, end: number): number | null {
  const whole = gaussRule(fn, start, end);
  if (!Number.isFinite(whole)) return null;
  const stack: Piece[] = [{ start, end, estimate: whole, depth: 0 }];
  let total = 0;
  let pieces = 0;
  while (stack.length > 0) {
    const piece = stack.pop()!;
    if (++pieces > MAX_PIECES) return null;
    const middle = (piece.start + piece.end) / 2;
    const left = gaussRule(fn, piece.start, middle);
    const right = gaussRule(fn, middle, piece.end);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
    const refined = left + right;
    const error = Math.abs(refined - piece.estimate);
    const scale = Math.max(1, Math.abs(whole));
    if (error <= RELATIVE_TOLERANCE * scale) {
      total += refined;
    } else if (piece.depth >= MAX_DEPTH) {
      if (error > DEPTH_LIMIT_TOLERANCE * scale) return null;
      total += refined;
    } else {
      stack.push({ start: piece.start, end: middle, estimate: left, depth: piece.depth + 1 });
      stack.push({ start: middle, end: piece.end, estimate: right, depth: piece.depth + 1 });
    }
  }
  return Number.isFinite(total) ? total : null;
}

/**
 * ∫ over a piece with possibly infinite ends, mapping infinite ones onto a finite interval:
 * x = a + t/(1 - t) sends t ∈ [0, 1) to x ∈ [a, ∞).
 */
function integratePiece(fn: RealFunction, start: number, end: number): number | null {
  if (Number.isFinite(start) && Number.isFinite(end)) return adaptiveIntegral(fn, start, end);
  if (!Number.isFinite(start) && !Number.isFinite(end)) {
    const left = integratePiece(fn, -Infinity, 0);
    const right = integratePiece(fn, 0, Infinity);
    return left === null || right === null ? null : left + right;
  }
  if (Number.isFinite(start)) {
    return adaptiveIntegral((t) => fn(start + t / (1 - t)) / ((1 - t) * (1 - t)), 0, 1);
  }
  return adaptiveIntegral((t) => fn(end - t / (1 - t)) / ((1 - t) * (1 - t)), 0, 1);
}

/**
 * ∫_start^end fn(x) dx, split at `breakpoints` (where fn may blow up).
 *
 * Args:
 *   fn: the integrand as a float function (NaN where undefined)
 *   start, end: limits; ±Infinity allowed; start > end gives the negated integral
 *   breakpoints: x values where fn may be singular; ones outside (start, end) are ignored
 *
 * Returns:
 *   The value, or null if the integral diverges or fn is undefined somewhere in between.
 */
export function numericIntegral(fn: RealFunction, start: number, end: number, breakpoints: number[] = []): number | null {
  if (start === end) return 0;
  if (start > end) {
    const reversed = numericIntegral(fn, end, start, breakpoints);
    return reversed === null ? null : -reversed;
  }
  const inside = [...new Set(breakpoints)].filter((point) => point > start && point < end).sort((first, second) => first - second);
  const edges = [start, ...inside, end];
  let total = 0;
  for (let index = 0; index + 1 < edges.length; index++) {
    const piece = integratePiece(fn, edges[index], edges[index + 1]);
    if (piece === null) return null;
    total += piece;
  }
  return total;
}
