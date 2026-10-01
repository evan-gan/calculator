import { numericIntegral } from '../numericIntegral';

// Float value of Σ_{n=start}^{∞} a(n) for series without a closed form.
// Fast-shrinking terms are simply added up; alternating series are averaged repeatedly
// (an Euler transform); slowly shrinking positive terms get an Euler–Maclaurin tail.
// Returns null when the series diverges or converges too slowly to tell.

const DIRECT_TERMS = 1000;
const EULER_ROUNDS = 30;

type TermFunction = (n: number) => number;

/**
 * Add up to DIRECT_TERMS terms, stopping early once they stop mattering.
 * `next` is the first index not yet added, or Infinity if the sum already converged.
 */
function sumUntilNegligible(term: TermFunction, start: number): { total: number; next: number } {
  let total = 0;
  let negligibleRun = 0;
  let n = start;
  for (; n < start + DIRECT_TERMS && negligibleRun < 10; n++) {
    const value = term(n);
    if (!Number.isFinite(value)) return { total: NaN, next: n };
    total += value;
    negligibleRun = Math.abs(value) <= 1e-17 * Math.abs(total) || value === 0 ? negligibleRun + 1 : 0;
  }
  return { total, next: negligibleRun >= 10 ? Infinity : n };
}

function isAlternating(term: TermFunction, from: number): boolean {
  let previous = term(from);
  for (let n = from + 1; n < from + 20; n++) {
    const value = term(n);
    if (Math.sign(value) === Math.sign(previous) || Math.abs(value) > Math.abs(previous)) return false;
    previous = value;
  }
  return true;
}

/** Repeatedly average consecutive partial sums; for alternating series this converges very fast. */
function eulerAveragedTail(term: TermFunction, partial: number, from: number): number {
  let sums: number[] = [];
  let running = partial;
  for (let n = from; n <= from + EULER_ROUNDS; n++) {
    running += term(n);
    sums.push(running);
  }
  while (sums.length > 1) sums = sums.slice(1).map((value, index) => (value + sums[index]) / 2);
  return sums[0];
}

/** Decay exponent p for terms like 1/n^p, measured between n and 10n. */
function decayExponent(term: TermFunction, from: number): number {
  return Math.log10(Math.abs(term(from)) / Math.abs(term(from * 10)));
}

export function numericInfiniteSum(term: TermFunction, start: number): number | null {
  const { total, next } = sumUntilNegligible(term, start);
  if (!Number.isFinite(total)) return null;
  if (next === Infinity) return total;
  if (Math.abs(term(next * 10)) >= Math.abs(term(next))) return null; // terms don't shrink
  if (isAlternating(term, next)) return eulerAveragedTail(term, total, next);

  const p = decayExponent(term, next);
  if (!(p > 1.05)) return null;
  // Euler–Maclaurin: Σ_{n≥N} a(n) ≈ ∫_N^∞ a + a(N)/2 - a'(N)/12
  const tailIntegral = numericIntegral(term, next, Infinity);
  if (tailIntegral === null) return null;
  const slope = (term(next + 1e-3) - term(next - 1e-3)) / 2e-3;
  return total + tailIntegral + term(next) / 2 - slope / 12;
}

// Factors are multiplied directly until they settle close to 1; at most this many.
const MAX_DIRECT_FACTORS = 1000;

/**
 * Float value of Π_{n=start}^{∞} a(n): the first factors directly, then exp(Σ ln a(n)) for the
 * tail, once the factors are positive and near 1. Null when it diverges or can't be computed.
 */
export function numericInfiniteProduct(factor: TermFunction, start: number): number | null {
  let product = 1;
  let n = start;
  for (; n < start + MAX_DIRECT_FACTORS; n++) {
    const value = factor(n);
    if (!Number.isFinite(value)) return null;
    if (value === 0) return 0;
    if (value > 0 && Math.abs(value - 1) < 0.5) break;
    product *= value;
  }
  const logTail = numericInfiniteSum((m) => Math.log(factor(m)), n);
  return logTail === null ? null : product * Math.exp(logTail);
}
