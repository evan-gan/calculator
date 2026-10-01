import { children, containsVariable } from '../../ast/inspect';
import { num, type Expr } from '../../ast/nodes';
import { differenceOf, negated, powerOf } from '../../operations/arithmetic';
import { expandAll, powerExpanded } from '../../operations/expand';
import type { Strategy } from '../types';

// Radical equations: isolate one root term and raise both sides to the root's index.
// √(x+3) = x - 3 -> x + 3 = (x - 3)² -> x = 1 or 6; checking later drops the fake x = 1.

/** Index q of the first root u^(p/q) containing the unknown, or null if there is none. */
function findRootIndex(expr: Expr, variable: string): bigint | null {
  if (
    expr.type === 'pow' &&
    expr.exponent.type === 'num' &&
    !expr.exponent.value.isInteger() &&
    containsVariable(expr.base, variable)
  ) {
    return expr.exponent.value.denominator;
  }
  for (const child of children(expr)) {
    const index = findRootIndex(child, variable);
    if (index !== null) return index;
  }
  return null;
}

export const radicalStrategy: Strategy = (expr, context) => {
  if (expr.type !== 'add') return null;
  for (const term of expr.terms) {
    const index = findRootIndex(term, context.variable);
    if (index === null) continue;
    // term + rest = 0  ->  term^q = (-rest)^q
    const rest = differenceOf(expr, term);
    const left = expandAll(powerOf(term, num(index)));
    const right = powerExpanded(expandAll(negated(rest)), index);
    // Any roots still left are handled by the nested solve (which may come back here).
    return context.solveNested(differenceOf(left, right));
  }
  return null;
};
