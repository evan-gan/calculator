import type { Expr } from '../../ast/nodes';

/**
 * Where the variable goes. For a finite point, `direction` is the side it comes from
 * (1 = from above, x → a⁺). For ±∞, `point` is null and `direction` is the sign of ∞.
 * Two-sided limits are found as two one-sided ones.
 */
export interface Approach {
  variable: string;
  point: Expr | null;
  direction: 1 | -1;
}

/**
 * What a part of the expression tends to: an exact value, ±∞, something that keeps oscillating
 * between finite bounds (sin x as x → ∞), or unknown (no rule decided it).
 */
export type LimitResult =
  | { kind: 'finite'; value: Expr }
  | { kind: 'infinite'; sign: 1 | -1 }
  | { kind: 'bounded' }
  | { kind: 'unknown' };

/**
 * Shared state for one limit computation. `budget` counts the remaining calls, so rewriting
 * rules (L'Hôpital, common denominators) can't run away on expressions they don't simplify.
 */
export interface LimitContext {
  approach: Approach;
  budget: { remaining: number };
  /** True when the expression has no other free variables, so it can be probed numerically. */
  canProbe: boolean;
  /** How many rewrites (L'Hôpital steps, common denominators, e^(v ln u)) led here. */
  rewrites: number;
}

/** Finds the limit of a subexpression; the rule files get it passed in rather than importing it. */
export type FindLimit = (expr: Expr, context: LimitContext) => LimitResult;

export const UNKNOWN: LimitResult = { kind: 'unknown' };
export const BOUNDED: LimitResult = { kind: 'bounded' };

export const finite = (value: Expr): LimitResult => ({ kind: 'finite', value });
export const infinite = (sign: 1 | -1): LimitResult => ({ kind: 'infinite', sign });
