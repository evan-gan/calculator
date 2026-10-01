import type { Expr } from '../../ast/nodes';

/** Integrate a simplified expression in a variable (defaults to the current one); null when no rule applies. */
export type Integrate = (expr: Expr, variable?: string) => Expr | null;

/**
 * One integration technique. Receives a simplified integrand that depends on the variable,
 * and returns an antiderivative (any form; it is simplified afterwards) or null to let the
 * next technique try. `integrate` recurses into the whole engine, one level deeper.
 */
export type IntegrationMethod = (expr: Expr, variable: string, integrate: Integrate) => Expr | null;
