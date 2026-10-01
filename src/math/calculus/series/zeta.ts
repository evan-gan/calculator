import { num, PI, pow, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';
import { differenceOf, powerOf, productOf, sumOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { bernoulliNumber, factorialOf } from './bernoulli';

// Σ_{m=start}^{∞} 1/m^p for even p, from ζ(p) = |Bₚ|·2^(p-1)·π^p/p! minus the first terms.
// Odd p (ζ(3) = 1.202...) has no known closed form, so it returns null.

// ζ(2k) is exact for any k, but past this the numbers are no longer useful on screen.
export const MAX_ZETA_POWER = 30;

function evenZeta(power: number): Expr {
  const coefficient = bernoulliNumber(power).abs().mul(new Rational(2n ** BigInt(power - 1), factorialOf(power)));
  return productOf(num(coefficient), powerOf(PI, num(power)));
}

/** Exact Σ_{m=start}^{∞} 1/m^power for start ≥ 1, or null when power is odd or too large. */
export function zetaTail(power: number, start: bigint): Expr | null {
  if (power % 2 !== 0 || power > MAX_ZETA_POWER || start < 1n) return null;
  const skipped: Expr[] = [];
  for (let m = 1n; m < start; m++) skipped.push(simplify(pow(num(m), num(-power))));
  return differenceOf(evenZeta(power), sumOf(...skipped));
}
