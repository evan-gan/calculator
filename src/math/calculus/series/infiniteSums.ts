import { INFINITY } from '../../ast/calculus';
import { containsVariable } from '../../ast/inspect';
import { E, num, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate } from '../../evaluate/evaluate';
import { Rational } from '../../number/rational';
import { differenceOf, powerOf, productOf, quotientOf, sumOf } from '../../operations/arithmetic';
import { geometricRatio, termAt } from './finiteSums';
import { DIVERGES_MESSAGE } from './messages';
import { telescopingSum } from './telescoping';
import { MAX_ZETA_POWER, zetaTail } from './zeta';

// Exact values of Σ_{n=a}^{∞} f(n) for the classic families:
// geometric (Σ r^n), even p-series (Σ 1/n² = π²/6), exponential (Σ x^n/n! = e^x)
// and telescoping rational functions (Σ 1/(n(n+1)) = 1).

function splitConstant(term: Expr, index: string): { constant: Expr; rest: Expr } {
  const factors = term.type === 'mul' ? term.factors : [term];
  return {
    constant: productOf(...factors.filter((factor) => !containsVariable(factor, index))),
    rest: productOf(...factors.filter((factor) => containsVariable(factor, index))),
  };
}

/** Σ_{n=from}^{to} f(n) term by term, for the few initial terms a formula doesn't start at. */
function initialTerms(term: Expr, index: string, from: bigint, to: bigint): Expr {
  const terms: Expr[] = [];
  for (let n = from; n <= to; n++) terms.push(termAt(term, index, num(n)));
  return sumOf(...terms);
}

function geometricSeries(term: Expr, index: string, lower: bigint): Expr | null {
  const ratio = geometricRatio(term, index);
  if (!ratio || containsVariable(ratio)) return null;
  if (Math.abs(evaluate(ratio)) >= 1) throw new MathError(`${DIVERGES_MESSAGE} (Its ratio has size 1 or more.)`);
  return quotientOf(termAt(term, index, num(lower)), differenceOf(num(1), ratio));
}

/** c/n^p: exact for even p, divergent for p ≤ 1, otherwise left to the numeric fallback. */
function pSeries(term: Expr, index: string, lower: bigint): Expr | null {
  const { constant, rest } = splitConstant(term, index);
  const isPowerOfIndex = rest.type === 'pow' && rest.base.type === 'var' && rest.base.name === index && rest.exponent.type === 'num';
  if (!isPowerOfIndex) return null;
  const power = rest.exponent.type === 'num' ? rest.exponent.value.neg() : Rational.ZERO;
  if (power.compare(Rational.ONE) <= 0) throw new MathError(`${DIVERGES_MESSAGE} (Σ 1/nᵖ only converges for p > 1.)`);
  if (lower < 1n) throw new MathError('This series divides by zero at n = 0. Start it at n = 1.');
  if (!power.isInteger() || power.numerator > BigInt(MAX_ZETA_POWER)) return null;
  const tail = zetaTail(Number(power.numerator), lower);
  return tail && productOf(constant, tail);
}

/** c(n)/n! with c(n) = c(0)·qⁿ sums to c(0)·e^q from n = 0. */
function exponentialSeries(term: Expr, index: string, lower: bigint): Expr | null {
  if (lower < 0n) return null;
  const factors = term.type === 'mul' ? term.factors : [term];
  const isReciprocalFactorialOfIndex = (factor: Expr) =>
    factor.type === 'pow' &&
    factor.exponent.type === 'num' &&
    factor.exponent.value.equals(Rational.MINUS_ONE) &&
    factor.base.type === 'func' &&
    factor.base.name === 'factorial' &&
    factor.base.args[0].type === 'var' &&
    factor.base.args[0].name === index;
  const reciprocalFactorial = factors.find(isReciprocalFactorialOfIndex);
  if (!reciprocalFactorial) return null;
  const rest = productOf(...factors.filter((factor) => factor !== reciprocalFactorial));
  const ratio = containsVariable(rest, index) ? geometricRatio(rest, index) : num(1);
  if (!ratio) return null;
  const fromZero = productOf(termAt(rest, index, num(0)), powerOf(E, ratio));
  return lower === 0n ? fromZero : differenceOf(fromZero, initialTerms(term, index, 0n, lower - 1n));
}

/**
 * Exact Σ_{n=lower}^{∞} f(n), or null when no formula applies.
 * Throws MathError for series known to diverge.
 */
export function exactInfiniteSum(term: Expr, index: string, lower: bigint): Expr | null {
  if (!containsVariable(term, index)) {
    if (term.type === 'num' && term.value.isZero()) return num(0);
    throw new MathError(`${DIVERGES_MESSAGE} (Its terms don't shrink to 0.)`);
  }
  return (
    geometricSeries(term, index, lower) ??
    pSeries(term, index, lower) ??
    exponentialSeries(term, index, lower) ??
    telescopingSum(term, index, num(lower), INFINITY)
  );
}

