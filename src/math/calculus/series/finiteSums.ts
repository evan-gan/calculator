import { containsVariable, substituteVariable } from '../../ast/inspect';
import { add, num, variable as variableNode, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { polynomialToExpr } from '../../number/rationalPolynomial';
import { differenceOf, powerOf, productOf, quotientOf, sumOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { toPolynomial } from '../../solve/polynomial/extract';
import { powerSumPolynomial } from './bernoulli';
import { telescopingSum } from './telescoping';

// Closed forms for Σ_{n=a}^{b} f(n) that work for symbolic limits too.

export function termAt(term: Expr, index: string, value: Expr): Expr {
  return simplify(substituteVariable(term, index, value));
}

/** f(n+1)/f(n) when it doesn't depend on n (a geometric series), else null. */
export function geometricRatio(term: Expr, index: string): Expr | null {
  try {
    const next = termAt(term, index, add(variableNode(index), num(1)));
    const ratio = quotientOf(next, term);
    return containsVariable(ratio, index) ? null : ratio;
  } catch (error) {
    // A term that is zero for some n has no ratio.
    if (error instanceof MathError) return null;
    throw error;
  }
}

/** Σ_{n=a}^{b} p(n) = S(b) - S(a-1), with S built from Faulhaber's power sums. */
function polynomialSum(coefficients: Expr[], lower: Expr, upper: Expr): Expr {
  const beforeLower = differenceOf(lower, num(1));
  const pieces = coefficients.map((coefficient, power) => {
    const powerSum = powerSumPolynomial(power);
    return productOf(coefficient, differenceOf(simplify(polynomialToExpr(powerSum, upper)), simplify(polynomialToExpr(powerSum, beforeLower))));
  });
  return sumOf(...pieces);
}

/** first·(1 - r^count)/(1 - r), or first·count when r = 1. */
function geometricSum(term: Expr, index: string, ratio: Expr, lower: Expr, upper: Expr): Expr {
  const first = termAt(term, index, lower);
  const count = sumOf(differenceOf(upper, lower), num(1));
  if (ratio.type === 'num' && ratio.value.isOne()) return productOf(first, count);
  return quotientOf(productOf(first, differenceOf(num(1), powerOf(ratio, count))), differenceOf(num(1), ratio));
}

/** Exact Σ_{n=lower}^{upper} for polynomial, geometric or telescoping terms, or null. */
export function closedFormSum(term: Expr, index: string, lower: Expr, upper: Expr): Expr | null {
  const coefficients = toPolynomial(term, index);
  if (coefficients) return polynomialSum(coefficients, lower, upper);
  const ratio = geometricRatio(term, index);
  return ratio ? geometricSum(term, index, ratio, lower, upper) : telescopingSum(term, index, lower, upper);
}
