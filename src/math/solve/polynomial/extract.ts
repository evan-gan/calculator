import { containsVariable } from '../../ast/inspect';
import { num, type Expr } from '../../ast/nodes';
import { productOf, sumOf } from '../../operations/arithmetic';
import { expandAll, termsOf } from '../../operations/expand';

// Polynomials above this degree are left to the numeric fallback.
const MAX_DEGREE = 60;

function variablePower(factor: Expr, variable: string): number | null {
  if (factor.type === 'var' && factor.name === variable) return 1;
  if (
    factor.type === 'pow' &&
    factor.base.type === 'var' &&
    factor.base.name === variable &&
    factor.exponent.type === 'num' &&
    factor.exponent.value.isInteger() &&
    !factor.exponent.value.isNegative()
  ) {
    return Number(factor.exponent.value.numerator);
  }
  return null;
}

/**
 * Read F as a polynomial in `variable`.
 *
 * Args:
 *   expr: simplified expression
 *   variable: the unknown's name
 *
 * Returns:
 *   Coefficients from lowest to highest degree (each a variable-free expression),
 *   or null if F isn't a polynomial in the variable (e.g. contains 1/x, √x, sin x).
 */
export function toPolynomial(expr: Expr, variable: string): Expr[] | null {
  const coefficientTerms: Expr[][] = [];
  for (const term of termsOf(expandAll(expr))) {
    const factors = term.type === 'mul' ? term.factors : [term];
    let degree = 0;
    const coefficientFactors: Expr[] = [];
    for (const factor of factors) {
      const power = variablePower(factor, variable);
      if (power !== null) degree += power;
      else if (containsVariable(factor, variable)) return null;
      else coefficientFactors.push(factor);
    }
    if (degree > MAX_DEGREE) return null;
    (coefficientTerms[degree] ??= []).push(productOf(...coefficientFactors));
  }
  const coefficients = Array.from({ length: coefficientTerms.length }, (_, degree) =>
    coefficientTerms[degree] ? sumOf(...coefficientTerms[degree]) : num(0),
  );
  return trimLeadingZeros(coefficients);
}

export function isZeroExpr(expr: Expr): boolean {
  return expr.type === 'num' && expr.value.isZero();
}

/** Drop zero coefficients at the high-degree end (they come from cancelled terms). */
export function trimLeadingZeros(coefficients: Expr[]): Expr[] {
  let end = coefficients.length;
  while (end > 0 && isZeroExpr(coefficients[end - 1])) end--;
  return coefficients.slice(0, end);
}
