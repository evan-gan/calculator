import { solvePolynomial } from '../polynomial/solvePolynomial';
import { toPolynomial } from '../polynomial/extract';
import type { Strategy } from '../types';

/** Handles anything that expands to a polynomial in the unknown. */
export const polynomialStrategy: Strategy = (expr, context) => {
  const coefficients = toPolynomial(expr, context.variable);
  return coefficients ? solvePolynomial(coefficients) : null;
};
