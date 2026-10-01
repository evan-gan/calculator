import { containsVariable, toKey } from '../ast/inspect';
import type { Expr } from '../ast/nodes';

// Canonical ordering of factors and terms. Sorting the same way every time makes
// equal expressions print identically, which is what like-term collection relies on.

function compareStrings(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

export function isRadical(expr: Expr): boolean {
  return expr.type === 'pow' && expr.base.type === 'num' && expr.exponent.type === 'num';
}

// Display order inside a product: 3√2·π·x·sin(x)·(x+1)
function factorRank(expr: Expr): number {
  if (expr.type === 'num') return 0;
  if (isRadical(expr)) return 1;
  const base = expr.type === 'pow' ? expr.base : expr;
  switch (base.type) {
    case 'const':
      return base.name === 'pi' ? 2 : 3;
    case 'var':
      return 4;
    case 'func':
      return 5;
    default:
      return 6;
  }
}

export function compareFactors(first: Expr, second: Expr): number {
  const rankDifference = factorRank(first) - factorRank(second);
  if (rankDifference !== 0) return rankDifference;
  const firstBase = first.type === 'pow' ? first.base : first;
  const secondBase = second.type === 'pow' ? second.base : second;
  return compareStrings(toKey(firstBase), toKey(secondBase)) || compareStrings(toKey(first), toKey(second));
}

/** Rough polynomial degree used only for ordering terms (x^3 before x^2 before x). */
function termDegree(expr: Expr): number {
  if (expr.type === 'var') return 1;
  if (expr.type === 'pow' && containsVariable(expr.base) && expr.exponent.type === 'num') {
    return expr.exponent.value.toNumber() * termDegree(expr.base);
  }
  if (expr.type === 'mul') return expr.factors.reduce((total, factor) => total + termDegree(factor), 0);
  return containsVariable(expr) ? 1 : 0;
}

// Terms with variables come first (highest degree first), then rational numbers, then other constants.
function termGroup(expr: Expr): number {
  if (containsVariable(expr)) return 0;
  return expr.type === 'num' ? 1 : 2;
}

export function compareTerms(first: Expr, second: Expr): number {
  const groupDifference = termGroup(first) - termGroup(second);
  if (groupDifference !== 0) return groupDifference;
  const degreeDifference = termDegree(second) - termDegree(first);
  if (degreeDifference !== 0) return degreeDifference;
  return compareStrings(stripCoefficientKey(first), stripCoefficientKey(second));
}

// Compare terms by their non-numeric part so 3x and 5y order by x vs y, not by 3 vs 5.
function stripCoefficientKey(expr: Expr): string {
  if (expr.type === 'mul' && expr.factors[0].type === 'num') {
    return expr.factors.slice(1).map(toKey).join(',');
  }
  return toKey(expr);
}
