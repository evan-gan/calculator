import { children, containsVariable, toKey } from '../ast/inspect';
import { func, num, type Expr } from '../ast/nodes';
import { MathError } from '../errors';
import { evaluate } from '../evaluate/evaluate';
import { solveEquation } from '../solve/solveEquation';
import type { SolveOutcome } from '../solve/types';

// Where an integrand may blow up, so numeric integration can split there instead of
// stepping over the spike: 1/x at 0, tan x at π/2 + πn, ln x at 0.

// A periodic family is listed only this many times inside one interval.
const MAX_POINTS = 2000;

/** Expressions whose zeros are singular points of the integrand. */
function collectDangerZeros(expr: Expr, variable: string, found: Expr[]): Expr[] {
  if (!containsVariable(expr, variable)) return found;
  if (expr.type === 'pow' && containsVariable(expr.base, variable) && evaluate(expr.exponent) < 0) found.push(expr.base);
  if (expr.type === 'func') {
    const [argument] = expr.args;
    if (expr.name === 'tan' || expr.name === 'sec') found.push(func('cos', argument));
    if (expr.name === 'csc' || expr.name === 'cot') found.push(func('sin', argument));
    if (expr.name === 'ln' || expr.name === 'log') found.push(argument);
  }
  children(expr).forEach((child) => collectDangerZeros(child, variable, found));
  return found;
}

// Integrals with a variable limit are evaluated many times (decimal display, solving), always
// with the same integrand, so its zeros are remembered. Cleared when full to bound memory.
const zerosCache = new Map<string, SolveOutcome | null>();
const MAX_CACHED = 200;

function solveForZeros(zeroOf: Expr, variable: string): SolveOutcome | null {
  const key = `${variable}:${toKey(zeroOf)}`;
  if (zerosCache.has(key)) return zerosCache.get(key)!;
  let outcome: SolveOutcome | null;
  try {
    outcome = solveEquation(zeroOf, num(0), variable);
  } catch (error) {
    // A zero we can't locate can't be split at; the adaptive integrator still catches divergence.
    if (!(error instanceof MathError)) throw error;
    outcome = null;
  }
  if (zerosCache.size >= MAX_CACHED) zerosCache.clear();
  zerosCache.set(key, outcome);
  return outcome;
}

function zerosInside(zeroOf: Expr, variable: string, start: number, end: number): number[] {
  const outcome = solveForZeros(zeroOf, variable);
  if (!outcome || outcome.kind !== 'solutions') return [];
  const points: number[] = [];
  for (const solution of outcome.solutions) {
    if (solution.kind === 'approximate') {
      points.push(solution.value);
      continue;
    }
    const value = evaluate(solution.value);
    const period = solution.period ? Math.abs(evaluate(solution.period)) : 0;
    if (!period) {
      points.push(value);
      continue;
    }
    // value + period·n for every n that lands inside the interval (ends clamped for infinite limits).
    const low = Math.ceil((Math.max(start, -1e6) - value) / period);
    const high = Math.floor((Math.min(end, 1e6) - value) / period);
    for (let n = low; n <= high && points.length < MAX_POINTS; n++) points.push(value + period * n);
  }
  return points;
}

/** x values in [start, end] where the integrand may be infinite or undefined. */
export function findSingularPoints(integrand: Expr, variable: string, start: number, end: number): number[] {
  const [low, high] = start <= end ? [start, end] : [end, start];
  return collectDangerZeros(integrand, variable, []).flatMap((zeroOf) => zerosInside(zeroOf, variable, low, high));
}
