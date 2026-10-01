import { containsVariable, toKey } from '../../ast/inspect';
import { num, type Expr } from '../../ast/nodes';
import { negated, powerOf, productOf, sumOf } from '../../operations/arithmetic';
import { expandAll } from '../../operations/expand';
import type { Strategy } from '../types';

// Rational equations: write F as N/D and solve N = 0. Roots of D are thrown out later
// when every candidate is checked against the original equation.

type Fraction = { numerator: Expr; denominator: Expr };

/** Combine a simplified expression into a single fraction N/D. */
export function toFraction(expr: Expr): Fraction {
  switch (expr.type) {
    case 'add':
      return expr.terms.map(toFraction).reduce(addFractions);
    case 'mul':
      return expr.factors.map(toFraction).reduce((left, right) => ({
        numerator: productOf(left.numerator, right.numerator),
        denominator: productOf(left.denominator, right.denominator),
      }));
    case 'pow':
      if (expr.exponent.type === 'num' && expr.exponent.value.isNegative()) {
        return { numerator: num(1), denominator: powerOf(expr.base, negated(expr.exponent)) };
      }
      return { numerator: expr, denominator: num(1) };
    default:
      return { numerator: expr, denominator: num(1) };
  }
}

function addFractions(left: Fraction, right: Fraction): Fraction {
  if (toKey(left.denominator) === toKey(right.denominator)) {
    return { numerator: sumOf(left.numerator, right.numerator), denominator: left.denominator };
  }
  return {
    numerator: sumOf(productOf(left.numerator, right.denominator), productOf(right.numerator, left.denominator)),
    denominator: productOf(left.denominator, right.denominator),
  };
}

export const rationalStrategy: Strategy = (expr, context) => {
  const { numerator, denominator } = toFraction(expr);
  if (!containsVariable(denominator, context.variable)) return null;
  return context.solveNested(expandAll(numerator));
};
