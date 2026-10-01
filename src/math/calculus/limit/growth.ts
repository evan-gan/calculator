import { containsVariable } from '../../ast/inspect';
import { num, type Expr } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { Rational } from '../../number/rational';
import { powerOf, productOf, sumOf } from '../../operations/arithmetic';
import { finite, infinite, type LimitResult } from './types';

// How an algebraic expression grows as x → ±∞: its leading term c·|x|^p, with x = ±|x|.
// Products multiply, powers raise, and sums keep their largest power, so
//   √(x² + x) ~ |x|,   x/(√(x² + x) + x) ~ x/(2x) = 1/2.
// When the largest powers of a sum cancel (√(x² + x) - x), the next order would be needed:
// that returns null and the conjugate rewrite in indeterminate.ts takes over.

type Growth = { coefficient: Expr; power: Rational };

function isZero(expr: Expr): boolean {
  return (expr.type === 'num' && expr.value.isZero()) || numericSign(expr) === 0;
}

function growthOfSum(terms: Expr[], variable: string, direction: 1 | -1): Growth | null {
  const growths: Growth[] = [];
  for (const term of terms) {
    const growth = growthOf(term, variable, direction);
    if (!growth) return null;
    growths.push(growth);
  }
  const largest = growths.reduce((top, { power }) => (power.compare(top) > 0 ? power : top), growths[0].power);
  const coefficient = sumOf(...growths.filter(({ power }) => power.equals(largest)).map(({ coefficient: leading }) => leading));
  return isZero(coefficient) ? null : { coefficient, power: largest };
}

function growthOfPower(base: Expr, exponent: Expr, variable: string, direction: 1 | -1): Growth | null {
  if (exponent.type !== 'num') return null;
  const growth = growthOf(base, variable, direction);
  if (!growth) return null;
  // A fractional power of a negative leading term isn't real.
  if (!exponent.value.isInteger() && numericSign(growth.coefficient) !== 1) return null;
  return { coefficient: powerOf(growth.coefficient, exponent), power: growth.power.mul(exponent.value) };
}

function growthOf(expr: Expr, variable: string, direction: 1 | -1): Growth | null {
  if (!containsVariable(expr, variable)) return { coefficient: expr, power: Rational.ZERO };
  switch (expr.type) {
    case 'var':
      return { coefficient: num(direction), power: Rational.ONE };
    case 'add':
      return growthOfSum(expr.terms, variable, direction);
    case 'mul': {
      let result: Growth = { coefficient: num(1), power: Rational.ZERO };
      for (const factor of expr.factors) {
        const growth = growthOf(factor, variable, direction);
        if (!growth) return null;
        result = { coefficient: productOf(result.coefficient, growth.coefficient), power: result.power.add(growth.power) };
      }
      return result;
    }
    case 'pow':
      return growthOfPower(expr.base, expr.exponent, variable, direction);
    default:
      return null;
  }
}

/** Limit at ±∞ of an algebraic expression from its leading term, or null when that can't be found. */
export function limitFromGrowth(expr: Expr, variable: string, direction: 1 | -1): LimitResult | null {
  const growth = growthOf(expr, variable, direction);
  if (!growth) return null;
  const order = growth.power.compare(Rational.ZERO);
  if (order < 0) return finite(num(0));
  if (order === 0) return finite(growth.coefficient);
  const sign = numericSign(growth.coefficient);
  return sign === 1 || sign === -1 ? infinite(sign) : null;
}
