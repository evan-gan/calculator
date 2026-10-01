import type { Expr } from '../ast/nodes';
import type { CalculationResult } from '../calculate';

/**
 * One parsed line of the expression list.
 * `explicitTarget` is set for definitions written as `v = ...` where v does not appear
 * on the right; those define v directly without solving.
 */
export type ParsedLine =
  | { kind: 'empty' }
  | { kind: 'invalid'; result: CalculationResult }
  | { kind: 'expression'; expr: Expr; variables: string[] }
  | { kind: 'equation'; left: Expr; right: Expr; variables: string[]; explicitTarget: string | null };

/** What other lines can use for a variable: an exact value, or why it isn't usable. */
export type VariableValue = { kind: 'value'; expr: Expr } | { kind: 'unavailable'; reason: string };

export interface LineResult {
  result: CalculationResult;
  /** The variable this line defines for the other lines, if any. */
  defines: string | null;
}
