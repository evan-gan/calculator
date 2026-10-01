import { Rational } from '../../number/rational';
import type { RationalPolynomial } from '../../number/rationalPolynomial';

// Bernoulli numbers drive both Faulhaber's formula (Σ n^k) and ζ(2k) = Σ 1/n^(2k).

const cache: Rational[] = [Rational.ONE];

function binomial(n: number, k: number): Rational {
  let result = 1n;
  for (let step = 1; step <= k; step++) result = (result * BigInt(n - k + step)) / BigInt(step);
  return Rational.fromInt(result);
}

/** Bₘ with the B₁ = -1/2 convention, from Σ_{j<m+1} C(m+1, j)·Bⱼ = 0. */
export function bernoulliNumber(index: number): Rational {
  for (let m = cache.length; m <= index; m++) {
    let total = Rational.ZERO;
    for (let j = 0; j < m; j++) total = total.add(binomial(m + 1, j).mul(cache[j]));
    cache.push(total.neg().div(Rational.fromInt(m + 1)));
  }
  return cache[index];
}

/**
 * Σ_{n=1}^{m} n^k as a polynomial in m (Faulhaber):
 * (1/(k+1)) Σ_j C(k+1, j)·B⁺ⱼ·m^(k+1-j), where B⁺ uses B₁ = +1/2.
 */
export function powerSumPolynomial(power: number): RationalPolynomial {
  const coefficients: Rational[] = Array.from({ length: power + 2 }, () => Rational.ZERO);
  for (let j = 0; j <= power; j++) {
    const bernoulli = j === 1 ? Rational.HALF : bernoulliNumber(j);
    coefficients[power + 1 - j] = binomial(power + 1, j).mul(bernoulli).div(Rational.fromInt(power + 1));
  }
  return coefficients;
}

/** n! as a bigint, for the ζ(2k) formula. */
export function factorialOf(value: number): bigint {
  let result = 1n;
  for (let factor = 2n; factor <= BigInt(value); factor++) result *= factor;
  return result;
}
