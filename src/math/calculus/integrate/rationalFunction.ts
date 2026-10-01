import { containsVariable } from '../../ast/inspect';
import { add, func, mul, num, pow, variable as variableNode, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';
import { dividePolynomials, polynomialToExpr, type RationalPolynomial } from '../../number/rationalPolynomial';
import { toRationalFunction } from '../readRationalFunction';
import { decomposePartialFractions, type LinearFraction } from './partialFractions';
import { integrateOverRealFactors } from './splitOverRealFactors';
import type { IntegrationMethod } from './types';

// ∫ N(x)/D(x) dx for polynomials with rational coefficients: long division for the polynomial
// part, partial fractions over D's rational roots, and the rest over D's real factors with
// irrational coefficients (x⁴ + 1 = (x² + √2x + 1)(x² - √2x + 1)).

/** ∫ Σ cₖ xᵏ dx = Σ cₖ x^(k+1)/(k+1) */
function integratePolynomial(polynomial: RationalPolynomial, variable: string): Expr {
  const raised = [Rational.ZERO, ...polynomial.map((coefficient, degree) => coefficient.div(Rational.fromInt(degree + 1)))];
  return polynomialToExpr(raised, variable);
}

/** c/(x - r) → c·ln|x - r|;  c/(x - r)^k → -c/((k - 1)(x - r)^(k-1)) */
function integrateLinearFraction({ root, power, coefficient }: LinearFraction, variable: string): Expr {
  const shifted = add(variableNode(variable), num(root.neg()));
  if (power === 1) return mul(num(coefficient), func('ln', func('abs', shifted)));
  const scale = coefficient.neg().div(Rational.fromInt(power - 1));
  return mul(num(scale), pow(shifted, num(1 - power)));
}

export const rationalFunctionMethod: IntegrationMethod = (expr, variable) => {
  if (!containsVariable(expr, variable)) return null;
  const fraction = toRationalFunction(expr, variable);
  if (!fraction) return null;
  const { quotient, remainder } = dividePolynomials(fraction.numerator, fraction.denominator);
  const pieces: Expr[] = [integratePolynomial(quotient, variable)];
  if (remainder.length > 0) {
    const { linear, irreducible } = decomposePartialFractions(remainder, fraction.denominator);
    pieces.push(...linear.map((piece) => integrateLinearFraction(piece, variable)));
    if (irreducible) {
      const rest = integrateOverRealFactors(irreducible.numerator, irreducible.denominator, variable);
      if (!rest) return null;
      pieces.push(rest);
    }
  }
  return add(...pieces);
};
