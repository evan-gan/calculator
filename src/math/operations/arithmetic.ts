import { fraction, num, type Expr } from '../ast/nodes';
import { simplifySum } from './add';
import { simplifyProduct } from './multiply';
import { simplifyPower } from './power';

// Convenience wrappers for combining expressions that are ALREADY simplified.
// Solvers and function rules use these so every intermediate result stays in canonical form.

export function sumOf(...terms: Expr[]): Expr {
  return simplifySum(terms);
}

export function productOf(...factors: Expr[]): Expr {
  return simplifyProduct(factors);
}

export function negated(expr: Expr): Expr {
  return simplifyProduct([num(-1), expr]);
}

export function differenceOf(left: Expr, right: Expr): Expr {
  return simplifySum([left, negated(right)]);
}

export function reciprocalOf(expr: Expr): Expr {
  return simplifyPower(expr, num(-1));
}

export function quotientOf(numerator: Expr, denominator: Expr): Expr {
  return simplifyProduct([numerator, reciprocalOf(denominator)]);
}

export function powerOf(base: Expr, exponent: Expr): Expr {
  return simplifyPower(base, exponent);
}

export function squareRootOf(radicand: Expr): Expr {
  return simplifyPower(radicand, fraction(1, 2));
}
