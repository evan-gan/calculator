import { children, containsVariable, toKey } from '../ast/inspect';
import { num, subtract, type Expr } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';
import { differenceOf, productOf, quotientOf } from '../operations/arithmetic';
import { simplify } from '../simplify/simplify';
import { isolationStrategy } from './strategies/isolate';
import { logarithmStrategy } from './strategies/logarithm';
import { findApproximateRoots } from './strategies/numeric';
import { polynomialStrategy } from './strategies/polynomial';
import { radicalStrategy } from './strategies/radical';
import { rationalStrategy } from './strategies/rational';
import { substitutionStrategy } from './strategies/substitution';
import type { CandidateResult, Solution, SolveContext, SolveOutcome, Strategy } from './types';
import { looksIdenticallyZero, satisfiesEquation } from './verify';

// Entry point for solving one equation in one unknown.
// Exact strategies are tried in order; the first one that applies wins.
const EXACT_STRATEGIES: Strategy[] = [
  polynomialStrategy,
  rationalStrategy,
  isolationStrategy,
  logarithmStrategy,
  substitutionStrategy,
  radicalStrategy,
];

// Transformations (squaring, substituting, clearing denominators) can nest; this caps them.
const MAX_DEPTH = 6;

function findCandidates(expr: Expr, variable: string, depth: number): CandidateResult | null {
  if (!containsVariable(expr, variable)) {
    return expr.type === 'num' && expr.value.isZero() ? 'identity' : [];
  }
  if (depth > MAX_DEPTH) return null;
  const context: SolveContext = {
    variable,
    depth,
    solveNested: (next, nextVariable = variable) => findCandidates(simplify(next), nextVariable, depth + 1),
  };
  for (const strategy of EXACT_STRATEGIES) {
    const result = strategy(expr, context);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Solve left = right for `variable`.
 *
 * Returns:
 *   solutions (exact where possible, verified against the original equation),
 *   allReals (with any excluded points), or noSolution.
 */
export function solveEquation(left: Expr, right: Expr, variable: string): SolveOutcome {
  const difference = simplify(subtract(left, right));
  let candidates = findCandidates(difference, variable, 0);
  if (candidates === null && looksIdenticallyZero(difference, variable)) candidates = 'identity';
  if (candidates === 'identity') {
    return { kind: 'allReals', variable, excluded: findExcludedPoints([left, right], variable) };
  }
  if (candidates === null) {
    candidates = findApproximateRoots(difference, variable).map((value): Solution => ({ kind: 'approximate', value }));
  }
  const solutions = finalizeSolutions(candidates, left, right, variable);
  return solutions.length > 0 ? { kind: 'solutions', variable, solutions } : { kind: 'noSolution', variable };
}

/** Float value used for sorting and checking a solution. */
export function solutionValue(solution: Solution): number {
  return solution.kind === 'exact' ? evaluate(solution.value) : solution.value;
}

/** Shift a periodic solution into [0, period) so sin x = -1/2 reads 7π/6 + 2πn, not -5π/6 + 2πn. */
function normalizePeriodic(solution: Solution): Solution {
  if (solution.kind !== 'exact' || !solution.period) return solution;
  const periodValue = evaluate(solution.period);
  const shifts = Math.floor(evaluate(solution.value) / periodValue + 1e-12);
  if (shifts === 0) return solution;
  return { ...solution, value: differenceOf(solution.value, productOf(num(shifts), solution.period)) };
}

function periodKey(solution: Solution): string {
  return solution.kind === 'exact' && solution.period ? toKey(solution.period) : '';
}

/** Two families a + Pn and a + P/2 + Pn are one family a + (P/2)n (e.g. sin x = 0 -> x = πn). */
function mergeHalfPeriods(solutions: Solution[]): Solution[] {
  const result = [...solutions];
  for (let first = 0; first < result.length; first++) {
    const a = result[first];
    if (a.kind !== 'exact' || !a.period) continue;
    const halfPeriod = quotientOf(a.period, num(2));
    const partnerIndex = result.findIndex(
      (b, index) =>
        index > first &&
        periodKey(b) === periodKey(a) &&
        Math.abs(solutionValue(b) - solutionValue(a) - evaluate(halfPeriod)) < 1e-9,
    );
    if (partnerIndex < 0) continue;
    result[first] = { ...a, period: halfPeriod };
    result.splice(partnerIndex, 1);
  }
  return result;
}

function finalizeSolutions(candidates: Solution[], left: Expr, right: Expr, variable: string): Solution[] {
  const unique: Solution[] = [];
  for (const candidate of candidates.map(normalizePeriodic)) {
    const value = solutionValue(candidate);
    if (!satisfiesEquation(left, right, variable, value, candidate.kind === 'approximate')) continue;
    const isDuplicate = unique.some(
      (existing) => periodKey(existing) === periodKey(candidate) && Math.abs(solutionValue(existing) - value) < 1e-9,
    );
    if (!isDuplicate) unique.push(candidate);
  }
  unique.sort((first, second) => solutionValue(first) - solutionValue(second));
  return mergeHalfPeriods(unique);
}

/** Bases of every division by an expression containing the unknown, e.g. x - 2 in 1/(x-2). */
function collectDenominators(expr: Expr, variable: string, found: Expr[]): Expr[] {
  if (expr.type === 'pow' && containsVariable(expr.base, variable) && !containsVariable(expr.exponent)) {
    if (evaluate(expr.exponent) < 0) found.push(expr.base);
  }
  children(expr).forEach((child) => collectDenominators(child, variable, found));
  return found;
}

/** Points where the original equation is undefined (zero denominators), for "all reals except ...". */
function findExcludedPoints(sides: Expr[], variable: string): Solution[] {
  const excluded: Solution[] = [];
  for (const denominator of sides.flatMap((side) => collectDenominators(side, variable, []))) {
    const zeros = findCandidates(simplify(denominator), variable, 1);
    if (!zeros || zeros === 'identity') continue;
    for (const zero of zeros) {
      if (!excluded.some((existing) => Math.abs(solutionValue(existing) - solutionValue(zero)) < 1e-9)) excluded.push(zero);
    }
  }
  return excluded.sort((first, second) => solutionValue(first) - solutionValue(second));
}
