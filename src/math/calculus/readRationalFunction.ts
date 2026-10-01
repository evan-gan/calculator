import { containsVariable } from '../ast/inspect';
import type { Expr } from '../ast/nodes';
import { Rational } from '../number/rational';
import {
  addPolynomials,
  degreeOf,
  dividePolynomials,
  gcdPolynomials,
  multiplyPolynomials,
  scalePolynomial,
  type RationalPolynomial,
} from '../number/rationalPolynomial';

// Reading an expression as N(x)/D(x) with rational coefficients. Integration (partial fractions),
// telescoping sums, infinite products and limits all start from this form.

export interface RationalFunction {
  numerator: RationalPolynomial;
  /** Never the zero polynomial. */
  denominator: RationalPolynomial;
}

// Beyond these the exact polynomial work gets slow and the results unreadable.
const MAX_DEGREE = 60;
const MAX_POWER = 20;

const ONE_POLYNOMIAL: RationalPolynomial = [Rational.ONE];

function constantFunction(value: Rational): RationalFunction {
  return { numerator: value.isZero() ? [] : [value], denominator: ONE_POLYNOMIAL };
}

function addFunctions(first: RationalFunction, second: RationalFunction): RationalFunction {
  // Equal denominators (1/(x+1) + x/(x+1)) are common enough to skip the cross-multiplication.
  const sameDenominator = first.denominator.length === second.denominator.length
    && first.denominator.every((coefficient, index) => coefficient.equals(second.denominator[index]));
  if (sameDenominator) return { numerator: addPolynomials(first.numerator, second.numerator), denominator: first.denominator };
  return {
    numerator: addPolynomials(multiplyPolynomials(first.numerator, second.denominator), multiplyPolynomials(second.numerator, first.denominator)),
    denominator: multiplyPolynomials(first.denominator, second.denominator),
  };
}

function multiplyFunctions(first: RationalFunction, second: RationalFunction): RationalFunction {
  return {
    numerator: multiplyPolynomials(first.numerator, second.numerator),
    denominator: multiplyPolynomials(first.denominator, second.denominator),
  };
}

function powerOfFunction(base: RationalFunction, exponent: Rational): RationalFunction | null {
  if (!exponent.isInteger() || exponent.abs().compare(Rational.fromInt(MAX_POWER)) > 0) return null;
  const count = Number(exponent.abs().numerator);
  let result: RationalFunction = constantFunction(Rational.ONE);
  for (let step = 0; step < count; step++) result = multiplyFunctions(result, base);
  if (!exponent.isNegative()) return result;
  if (result.numerator.length === 0) return null; // 1/0
  return { numerator: result.denominator, denominator: result.numerator };
}

function isTooLarge({ numerator, denominator }: RationalFunction): boolean {
  return degreeOf(numerator) > MAX_DEGREE || degreeOf(denominator) > MAX_DEGREE;
}

function readFunction(expr: Expr, variable: string): RationalFunction | null {
  if (expr.type === 'num') return constantFunction(expr.value);
  if (!containsVariable(expr, variable)) return null; // π, √2, other variables: not rational coefficients
  switch (expr.type) {
    case 'var':
      return { numerator: [Rational.ZERO, Rational.ONE], denominator: ONE_POLYNOMIAL };
    case 'add':
    case 'mul': {
      const parts = expr.type === 'add' ? expr.terms : expr.factors;
      const combine = expr.type === 'add' ? addFunctions : multiplyFunctions;
      let result: RationalFunction | null = null;
      for (const part of parts) {
        const next = readFunction(part, variable);
        if (!next) return null;
        result = result ? combine(result, next) : next;
        if (isTooLarge(result)) return null;
      }
      return result;
    }
    case 'pow': {
      const base = readFunction(expr.base, variable);
      if (!base || expr.exponent.type !== 'num') return null;
      const result = powerOfFunction(base, expr.exponent.value);
      return result && !isTooLarge(result) ? result : null;
    }
    default:
      return null;
  }
}

/** Cancel common factors and make the denominator monic, so equal functions have equal parts. */
function reduceFunction({ numerator, denominator }: RationalFunction): RationalFunction {
  const common = gcdPolynomials(numerator, denominator);
  const reducedNumerator = dividePolynomials(numerator, common).quotient;
  const reducedDenominator = dividePolynomials(denominator, common).quotient;
  const scale = reducedDenominator[reducedDenominator.length - 1].inverse();
  return { numerator: scalePolynomial(reducedNumerator, scale), denominator: scalePolynomial(reducedDenominator, scale) };
}

/**
 * Read a simplified expression as N(x)/D(x) with rational coefficients, in lowest terms
 * with a monic denominator. Null when it isn't one (sin x, √x, π·x, another variable).
 */
export function toRationalFunction(expr: Expr, variable: string): RationalFunction | null {
  const result = readFunction(expr, variable);
  if (!result || result.denominator.length === 0) return null;
  return reduceFunction(result);
}
