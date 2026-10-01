import { fraction, num, type Expr, type SumNode } from '../ast/nodes';
import { exactIntegerRoot } from '../number/integer';
import { Rational } from '../number/rational';
import { numericSign } from '../evaluate/evaluate';
import { simplifySum } from './add';
import { simplifyProduct } from './multiply';
import { simplifyPower } from './power';

// Rules that remove radicals from denominators and un-nest square roots.

function squareIfRational(term: Expr): Rational | null {
  const squared = simplifyPower(term, num(2));
  return squared.type === 'num' ? squared.value : null;
}

/**
 * 1 / (t1 + t2) where t1² and t2² are rational, using the conjugate:
 * 1/(a + b√k) = (a - b√k) / (a² - b²k). Returns null when the sum isn't of that shape.
 */
export function rationalizeReciprocal(sum: SumNode): Expr | null {
  if (sum.terms.length !== 2) return null;
  const [first, second] = sum.terms;
  const firstSquared = squareIfRational(first);
  const secondSquared = squareIfRational(second);
  if (!firstSquared || !secondSquared) return null;
  const denominator = firstSquared.sub(secondSquared);
  if (denominator.isZero()) return null;
  const conjugate = simplifySum([first, simplifyProduct([num(-1), second])]);
  return simplifyProduct([num(denominator.inverse()), conjugate]);
}

function rationalSquareRoot(value: Rational): Rational | null {
  if (value.isNegative()) return null;
  const numeratorRoot = exactIntegerRoot(value.numerator, 2n);
  const denominatorRoot = exactIntegerRoot(value.denominator, 2n);
  return numeratorRoot !== null && denominatorRoot !== null ? new Rational(numeratorRoot, denominatorRoot) : null;
}

/**
 * √(a ± √s) = √((a+d)/2) ± √((a-d)/2) when d = √(a² - s) is rational.
 * Example: √(3 + 2√2) = 1 + √2. Returns null when the radical can't be denested.
 */
export function denestSquareRoot(sum: SumNode): Expr | null {
  if (sum.terms.length !== 2) return null;
  const rationalTerm = sum.terms.find((term) => term.type === 'num');
  const radicalTerm = sum.terms.find((term) => term.type !== 'num');
  if (!rationalTerm || rationalTerm.type !== 'num' || !radicalTerm) return null;
  const a = rationalTerm.value;
  const s = squareIfRational(radicalTerm);
  const radicalSign = numericSign(radicalTerm);
  if (!s || radicalSign === null || a.isNegative()) return null;
  const d = rationalSquareRoot(a.mul(a).sub(s));
  if (!d || a.compare(d) < 0) return null;
  const half = Rational.HALF;
  const left = simplifyPower(num(a.add(d).mul(half)), fraction(1, 2));
  const right = simplifyPower(num(a.sub(d).mul(half)), fraction(1, 2));
  return simplifySum([left, simplifyProduct([num(radicalSign), right])]);
}
