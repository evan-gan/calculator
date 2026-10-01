import type { Expr, FunctionName } from '../../ast/nodes';

/**
 * Everything the engine needs to know about one built-in function.
 * To add a function: create a file in this folder exporting a definition, then list it in registry.ts.
 */
export interface FunctionDefinition {
  name: FunctionName;
  /** LaTeX operator used when printing, e.g. '\\sin'. */
  latex: string;
  arity: 1 | 2;
  /**
   * Exact simplification rule. Receives already-simplified arguments.
   * Return a replacement expression (it will be simplified again), or null to keep the call as-is.
   * Throw MathError for inputs outside the domain (e.g. ln(-1)).
   */
  simplify(args: Expr[]): Expr | null;
  /** Float evaluation; return NaN outside the real domain. */
  evaluate(args: number[]): number;
}
