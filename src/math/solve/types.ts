import type { Expr } from '../ast/nodes';

/**
 * One solution of an equation.
 * exact: `value` (+ `period`·n for any integer n, when periodic, e.g. trig equations)
 * approximate: a float found numerically because no exact method applied
 */
export type Solution =
  | { kind: 'exact'; value: Expr; period?: Expr }
  | { kind: 'approximate'; value: number };

export type SolveOutcome =
  | { kind: 'solutions'; variable: string; solutions: Solution[] }
  | { kind: 'allReals'; variable: string; excluded: Solution[] }
  | { kind: 'noSolution'; variable: string };

/** What a strategy found for F(x) = 0: candidate solutions, or "every x works". */
export type CandidateResult = Solution[] | 'identity';

export interface SolveContext {
  variable: string;
  depth: number;
  /**
   * Solve another F = 0 one level deeper (used by strategies that transform the equation).
   * Pass `variable` to solve for a different unknown, e.g. a substitution u = sin x.
   */
  solveNested(expr: Expr, variable?: string): CandidateResult | null;
}

/**
 * A strategy inspects a simplified F(x) and either solves F(x) = 0 or returns null
 * to let the next strategy try. Candidates are verified against the original equation later,
 * so strategies may return extra (extraneous) candidates but must not miss real ones.
 */
export type Strategy = (expr: Expr, context: SolveContext) => CandidateResult | null;

export type ExactSolution = Extract<Solution, { kind: 'exact' }>;

export function exact(value: Expr, period?: Expr): ExactSolution {
  return period ? { kind: 'exact', value, period } : { kind: 'exact', value };
}
