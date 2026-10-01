import { containsVariable } from '../../ast/inspect';
import { add, func, mul, num, pow, variable as variableNode, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';
import {
  dividePolynomials,
  polynomialToExpr,
  toRationalPolynomial,
  type RationalPolynomial,
} from '../../number/rationalPolynomial';
import { negated, powerOf, productOf } from '../../operations/arithmetic';
import { toPolynomial } from '../../solve/polynomial/extract';
import { decomposePartialFractions, type LinearFraction } from './partialFractions';
import { integrateReciprocalQuadratic, logOfQuadratic, type QuadraticCoefficients } from './quadratic';
import type { IntegrationMethod } from './types';

// ∫ N(x)/D(x) dx for polynomials with rational coefficients:
// long division for the polynomial part, then partial fractions for the rest.

function isNegativeIntegerPower(factor: Expr): factor is Extract<Expr, { type: 'pow' }> {
  return factor.type === 'pow' && factor.exponent.type === 'num' && factor.exponent.value.isInteger() && factor.exponent.value.isNegative();
}

/** Split a simplified term into rational-coefficient polynomials N and D with term = N/D. */
function splitFraction(expr: Expr, variable: string): { numerator: RationalPolynomial; denominator: RationalPolynomial } | null {
  const factors = expr.type === 'mul' ? expr.factors : [expr];
  const top = factors.filter((factor) => !isNegativeIntegerPower(factor));
  // (x+1)^-2 contributes (x+1)^2 to the denominator.
  const bottom = factors.filter(isNegativeIntegerPower).map((factor) => powerOf(factor.base, negated(factor.exponent)));
  const numeratorCoefficients = toPolynomial(productOf(...top), variable);
  const denominatorCoefficients = toPolynomial(productOf(...bottom), variable);
  if (!numeratorCoefficients || !denominatorCoefficients) return null;
  const numerator = toRationalPolynomial(numeratorCoefficients);
  const denominator = toRationalPolynomial(denominatorCoefficients);
  if (!numerator || !denominator || denominator.length === 0) return null;
  return { numerator, denominator };
}

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

/** (Bx + C)/(px² + qx + s) = B/(2p)·(2px + q)/Q + (C - Bq/(2p))/Q: a logarithm plus the reciprocal rule. */
function integrateQuadraticFraction(numerator: RationalPolynomial, denominator: RationalPolynomial, variable: string): Expr | null {
  const [constant = Rational.ZERO, slope = Rational.ZERO] = numerator;
  const [s, q, p] = denominator;
  const coefficients: QuadraticCoefficients = { p: num(p), q: num(q), s: num(s) };
  const logScale = slope.div(p.mul(Rational.fromInt(2)));
  const reciprocalScale = constant.sub(logScale.mul(q));
  const reciprocal = reciprocalScale.isZero() ? num(0) : integrateReciprocalQuadratic(coefficients, variable);
  if (!reciprocal) return null;
  return add(mul(num(logScale), logOfQuadratic(coefficients, variable)), mul(num(reciprocalScale), reciprocal));
}

export const rationalFunctionMethod: IntegrationMethod = (expr, variable) => {
  if (!containsVariable(expr, variable)) return null;
  const fraction = splitFraction(expr, variable);
  if (!fraction) return null;
  const { quotient, remainder } = dividePolynomials(fraction.numerator, fraction.denominator);
  const pieces: Expr[] = [integratePolynomial(quotient, variable)];
  if (remainder.length > 0) {
    const partialFractions = decomposePartialFractions(remainder, fraction.denominator);
    if (!partialFractions) return null;
    pieces.push(...partialFractions.linear.map((piece) => integrateLinearFraction(piece, variable)));
    if (partialFractions.quadratic) {
      const { numerator, denominator } = partialFractions.quadratic;
      const quadraticPart = integrateQuadraticFraction(numerator, denominator, variable);
      if (!quadraticPart) return null;
      pieces.push(quadraticPart);
    }
  }
  return add(...pieces);
};
