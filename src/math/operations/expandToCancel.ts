import type { Expr, SumNode } from '../ast/nodes';
import { simplifySum } from './add';
import { multiplyExpanded } from './expand';

// The simplifier keeps products like a(b + c) factored. When multiplying them out lets
// terms cancel, the expanded form is simpler: a(b + c) − ab = ac, x(x + 1) − x² = x.

// Expanding bigger sums is rarely worth the work on every simplification.
const MAX_TERMS = 12;

/**
 * Multiply out the factored products in a simplified sum, keeping the result only when it
 * has fewer terms than the sum itself (so x(x + 1) + 1 stays as it is).
 *
 * Returns:
 *   the shorter expanded sum, or null when expanding doesn't cancel anything
 */
export function expandToCancel(sum: SumNode): Expr | null {
  if (sum.terms.length > MAX_TERMS || !sum.terms.some(isFactoredProduct)) return null;
  const expandedTerms = sum.terms.flatMap((term) => (isFactoredProduct(term) ? termsOf(expandProduct(term)) : [term]));
  if (expandedTerms.length > MAX_TERMS * 4) return null;
  const expanded = simplifySum(expandedTerms);
  return termsOf(expanded).length < sum.terms.length ? expanded : null;
}

/** A product with a sum among its factors, as a(b + c). */
function isFactoredProduct(term: Expr): term is Extract<Expr, { type: 'mul' }> {
  return term.type === 'mul' && term.factors.some((factor) => factor.type === 'add');
}

function expandProduct(term: Extract<Expr, { type: 'mul' }>): Expr {
  return term.factors.reduce(multiplyExpanded);
}

function termsOf(expr: Expr): Expr[] {
  return expr.type === 'add' ? expr.terms : [expr];
}
