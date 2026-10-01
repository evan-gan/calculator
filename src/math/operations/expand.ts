import type { Expr } from '../ast/nodes';
import { simplifySum } from './add';
import { simplifyProduct } from './multiply';
import { simplifyPower } from './power';

// Full polynomial expansion: (x+1)(x-1) -> x² - 1. The simplifier keeps products of
// variable sums factored for display, so the solvers call this when they need coefficients.

// (x+1)^n with larger n produces too many terms to be useful on a calculator screen.
const MAX_EXPANDED_POWER = 40n;

export function termsOf(expr: Expr): Expr[] {
  return expr.type === 'add' ? expr.terms : [expr];
}

/** Multiply two simplified expressions, distributing every term over every term. */
export function multiplyExpanded(left: Expr, right: Expr): Expr {
  const products = termsOf(left).flatMap((leftTerm) =>
    termsOf(right).map((rightTerm) => simplifyProduct([leftTerm, rightTerm])),
  );
  return simplifySum(products);
}

/** Raise a simplified expression to a positive integer power by repeated distribution. */
export function powerExpanded(base: Expr, exponent: bigint): Expr {
  let result = base;
  for (let step = 1n; step < exponent; step++) result = multiplyExpanded(result, base);
  return result;
}

/** Expand every product and small positive integer power of a sum in a simplified expression. */
export function expandAll(expr: Expr): Expr {
  switch (expr.type) {
    case 'add':
      return simplifySum(expr.terms.map(expandAll));
    case 'mul':
      return expr.factors.map(expandAll).reduce(multiplyExpanded);
    case 'pow': {
      const base = expandAll(expr.base);
      const exponent = expr.exponent;
      const isSmallPositiveInteger =
        exponent.type === 'num' &&
        exponent.value.isInteger() &&
        exponent.value.numerator > 0n &&
        exponent.value.numerator <= MAX_EXPANDED_POWER;
      if (base.type === 'add' && isSmallPositiveInteger) return powerExpanded(base, exponent.value.numerator);
      return simplifyPower(base, exponent);
    }
    default:
      return expr;
  }
}
