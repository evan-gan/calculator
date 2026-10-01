import { num, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';
import { degreeOf } from '../../number/rationalPolynomial';
import { deflate, evaluatePolynomial } from '../../solve/polynomial/rationalRoots';
import { toRationalFunction } from '../readRationalFunction';
import { finite, infinite, type Approach, type LimitResult } from './types';

// Limits of N(x)/D(x) with rational coefficients, exactly. toRationalFunction already cancels
// common factors, so (x² - 1)/(x - 1) at 1 is (x + 1)/1 there. At ±∞ the degrees decide.

const signOf = (value: Rational): 1 | -1 => (value.isNegative() ? -1 : 1);

function limitAtInfinity(numerator: Rational[], denominator: Rational[], direction: 1 | -1): LimitResult {
  const gap = degreeOf(numerator) - degreeOf(denominator);
  const leadingRatio = numerator[numerator.length - 1].div(denominator[denominator.length - 1]);
  if (gap < 0) return finite(num(0));
  if (gap === 0) return finite(num(leadingRatio));
  // c·x^gap: odd gaps flip sign towards -∞.
  const directionSign = gap % 2 === 0 ? 1 : direction;
  return infinite((signOf(leadingRatio) * directionSign) as 1 | -1);
}

/** N(a)/D(a), or ±∞ at a root of D: near a, f ≈ N(a)/(R(a)·(x - a)^m) with D = (x - a)^m·R. */
function limitAtPoint(numerator: Rational[], denominator: Rational[], point: Rational, direction: 1 | -1): LimitResult {
  const bottom = evaluatePolynomial(denominator, point);
  if (!bottom.isZero()) return finite(num(evaluatePolynomial(numerator, point).div(bottom)));
  let cofactor = denominator;
  let multiplicity = 0;
  while (evaluatePolynomial(cofactor, point).isZero()) {
    cofactor = deflate(cofactor, point);
    multiplicity++;
  }
  // (x - a)^m has the sign of the side approached when m is odd, and is positive when m is even.
  const sideSign = multiplicity % 2 === 0 ? 1 : direction;
  return infinite((signOf(evaluatePolynomial(numerator, point).div(evaluatePolynomial(cofactor, point))) * sideSign) as 1 | -1);
}

/** The exact limit of a rational function of the variable, or null when the expression isn't one. */
export function rationalFunctionLimit(expr: Expr, approach: Approach): LimitResult | null {
  const fraction = toRationalFunction(expr, approach.variable);
  if (!fraction) return null;
  const { numerator, denominator } = fraction;
  if (numerator.length === 0) return finite(num(0));
  if (!approach.point) return limitAtInfinity(numerator, denominator, approach.direction);
  if (approach.point.type !== 'num') return null;
  return limitAtPoint(numerator, denominator, approach.point.value, approach.direction);
}
