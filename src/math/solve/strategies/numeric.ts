import type { Expr } from '../../ast/nodes';
import { evaluate } from '../../evaluate/evaluate';
import type { Solution, Strategy } from '../types';

// Last resort: scan for sign changes and refine them by bisection. Results are always
// labelled approximate so they're never presented as exact.

const SCAN_MIN = -100;
const SCAN_MAX = 100;
const SCAN_STEPS = 20_000;
const BISECTION_STEPS = 80;
// Rejects sign changes caused by poles (like tan x at π/2) rather than real roots.
const ROOT_TOLERANCE = 1e-6;
const MAX_ROOTS = 25;

function bisect(f: (x: number) => number, low: number, high: number): number {
  let lowValue = f(low);
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = (low + high) / 2;
    const middleValue = f(middle);
    if (middleValue === 0) return middle;
    if (Math.sign(middleValue) === Math.sign(lowValue)) {
      low = middle;
      lowValue = middleValue;
    } else {
      high = middle;
    }
  }
  return (low + high) / 2;
}

export function findApproximateRoots(expr: Expr, variable: string): number[] {
  const f = (x: number) => evaluate(expr, { [variable]: x });
  const roots: number[] = [];
  const step = (SCAN_MAX - SCAN_MIN) / SCAN_STEPS;
  let previousX = SCAN_MIN;
  let previousValue = f(previousX);
  for (let index = 1; index <= SCAN_STEPS && roots.length < MAX_ROOTS; index++) {
    const x = SCAN_MIN + index * step;
    const value = f(x);
    if (Number.isFinite(value) && Number.isFinite(previousValue)) {
      if (value === 0) {
        roots.push(x);
      } else if (previousValue !== 0 && Math.sign(value) !== Math.sign(previousValue)) {
        const root = bisect(f, previousX, x);
        if (Math.abs(f(root)) < ROOT_TOLERANCE) roots.push(root);
      }
    }
    previousX = x;
    previousValue = value;
  }
  return roots;
}

export const numericStrategy: Strategy = (expr, context) =>
  findApproximateRoots(expr, context.variable).map((value): Solution => ({ kind: 'approximate', value }));
