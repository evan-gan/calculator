import { collectVariables, containsVariable } from '../ast/inspect';
import { subtract, type Expr } from '../ast/nodes';
import { errorResult, parseLine, type CalculationOptions } from '../calculate';
import type { ParsedLine } from './types';

/**
 * `v = ...` where v is a lone variable that doesn't appear on the right. Only the left side
 * counts, so `2b = a` solves for b using a rather than redefining a.
 */
function explicitTargetOf(left: Expr, right: Expr): string | null {
  return left.type === 'var' && !containsVariable(right, left.name) ? left.name : null;
}

export function parseLines(latexLines: string[], options: CalculationOptions): ParsedLine[] {
  return latexLines.map((latex): ParsedLine => {
    if (latex.trim() === '') return { kind: 'empty' };
    try {
      const statement = parseLine(latex, options);
      if (statement.kind === 'expression') {
        return { kind: 'expression', expr: statement.expr, variables: collectVariables(statement.expr) };
      }
      const { left, right } = statement;
      return {
        kind: 'equation',
        left,
        right,
        variables: collectVariables(subtract(left, right)),
        explicitTarget: explicitTargetOf(left, right),
      };
    } catch (error) {
      return { kind: 'invalid', result: errorResult(error, latex) };
    }
  });
}
