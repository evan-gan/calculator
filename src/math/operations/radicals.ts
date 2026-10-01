import { fraction, num, pow, type Expr } from '../ast/nodes';
import { factorize } from '../number/integer';
import { Rational } from '../number/rational';

// Integer radicals are tracked as prime -> exponent so √8·√2 = 4 and √12 = 2√3 fall out
// of plain exponent arithmetic instead of special cases.

export type PrimeExponents = Map<bigint, Rational>;

/** Record (base)^(exponent) for a positive rational base, e.g. (3/8)^(1/2). */
export function collectRadical(primeExponents: PrimeExponents, base: Rational, exponent: Rational): void {
  const addPrime = (prime: bigint, multiplicity: bigint, sign: bigint) => {
    const contribution = exponent.mul(Rational.fromInt(multiplicity * sign));
    primeExponents.set(prime, (primeExponents.get(prime) ?? Rational.ZERO).add(contribution));
  };
  for (const [prime, multiplicity] of factorize(base.numerator)) addPrime(prime, multiplicity, 1n);
  for (const [prime, multiplicity] of factorize(base.denominator)) addPrime(prime, multiplicity, -1n);
}

/**
 * Turn collected prime exponents into a rational coefficient plus radicals with exponents in (0, 1).
 * Keeping exponents in (0, 1) is also what rationalizes denominators: 2^(-1/2) = 2^(-1)·2^(1/2) = √2/2.
 *
 * Returns:
 *   coefficient: rational part pulled out of the radicals
 *   radicals: one `N^(1/q)` node per root index q, e.g. √6 rather than √2·√3
 */
export function normalizeRadicals(primeExponents: PrimeExponents): { coefficient: Rational; radicals: Expr[] } {
  let coefficient = Rational.ONE;
  const radicandByIndex = new Map<bigint, bigint>();
  for (const [prime, exponent] of primeExponents) {
    const wholePart = exponent.floor();
    const fractionalPart = exponent.sub(Rational.fromInt(wholePart));
    coefficient = coefficient.mul(Rational.fromInt(prime).pow(wholePart));
    if (fractionalPart.isZero()) continue;
    const index = fractionalPart.denominator;
    const radicand = (radicandByIndex.get(index) ?? 1n) * prime ** fractionalPart.numerator;
    radicandByIndex.set(index, radicand);
  }
  const radicals = [...radicandByIndex.entries()]
    .sort(([firstIndex], [secondIndex]) => (firstIndex < secondIndex ? -1 : 1))
    .map(([index, radicand]) => pow(num(radicand), fraction(1n, index)));
  return { coefficient, radicals };
}
