import { containsVariable } from '../../ast/inspect';
import type { Expr } from '../../ast/nodes';
import { differenceOf, productOf } from '../../operations/arithmetic';
import { toPolynomial } from '../../solve/polynomial/extract';
import { derivativeOf } from '../differentiate';
import type { IntegrationMethod } from './types';

// Integration by parts, ∫ u dv = u·v - ∫ v du, for a polynomial times one other factor.
// Logs and inverse trig get differentiated (∫ x ln x dx); anything else with a known
// antiderivative is integrated while the polynomial is differentiated (∫ x² eˣ dx, ∫ x eˣ sin x dx).

const DIFFERENTIATE_FIRST = new Set(['ln', 'log', 'arcsin', 'arccos', 'arctan']);

function isPolynomialFactor(factor: Expr, variable: string): boolean {
  return containsVariable(factor, variable) && toPolynomial(factor, variable) !== null;
}

export const partsMethod: IntegrationMethod = (expr, variable, integrate) => {
  const factors = expr.type === 'mul' ? expr.factors : [expr];
  const others = factors.filter((factor) => !isPolynomialFactor(factor, variable));
  // Two other factors only for pairs like eˣ·sin x that integrate together; more gets slow for no gain.
  if (others.length === 0 || others.length > 2) return null;
  const other = productOf(...others);
  const polynomial = productOf(...factors.filter((factor) => isPolynomialFactor(factor, variable)));

  if (others.length === 1 && other.type === 'func' && DIFFERENTIATE_FIRST.has(other.name)) {
    const polynomialAntiderivative = integrate(polynomial);
    if (!polynomialAntiderivative) return null;
    const remaining = integrate(productOf(polynomialAntiderivative, derivativeOf(other, variable)));
    return remaining && differenceOf(productOf(polynomialAntiderivative, other), remaining);
  }
  // Without a polynomial to shrink, parts would only go in circles.
  if (!containsVariable(polynomial, variable)) return null;
  const otherAntiderivative = integrate(other);
  if (!otherAntiderivative) return null;
  const remaining = integrate(productOf(derivativeOf(polynomial, variable), otherAntiderivative));
  return remaining && differenceOf(productOf(polynomial, otherAntiderivative), remaining);
};
