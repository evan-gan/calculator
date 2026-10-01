import { calculate, type SolutionDisplay } from '../src/math';
import type { Expr } from '../src/math/ast/nodes';
import { toLatex } from '../src/math/format/toLatex';
import { parseLatex } from '../src/math/parse/parser';
import { simplify } from '../src/math/simplify/simplify';

/** Parse a LaTeX expression (no "=") into a raw tree. */
export function parseExpr(latex: string): Expr {
  const statement = parseLatex(latex);
  if (statement.kind !== 'expression') throw new Error(`Expected an expression, got an equation: ${latex}`);
  return statement.expr;
}

/** Parse, simplify exactly, and print back to LaTeX. */
export function simplifyLatex(latex: string): string {
  return toLatex(simplify(parseExpr(latex)));
}

/** Run an equation through the full pipeline and return its solution display. */
export function solveLatex(latex: string): SolutionDisplay {
  const result = calculate(latex);
  if (result.kind !== 'solved') throw new Error(`Expected a solved result for ${latex}, got "${result.kind}"`);
  return result.solutions;
}
