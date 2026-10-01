// BigInt helpers shared by the rational number class, radical simplification and the solvers.

export function absBig(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function gcdBig(first: bigint, second: bigint): bigint {
  let a = absBig(first);
  let b = absBig(second);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function lcmBig(first: bigint, second: bigint): bigint {
  if (first === 0n || second === 0n) return 0n;
  return absBig(first * second) / gcdBig(first, second);
}

/** Largest integer r with r^degree <= value (value must be >= 0). Uses Newton's method. */
export function integerRootFloor(value: bigint, degree: bigint): bigint {
  if (value < 0n) throw new RangeError('integerRootFloor needs a non-negative value');
  if (value < 2n) return value;
  // Start above the true root (2^ceil(bits/degree)) so Newton descends monotonically.
  const bitLength = BigInt(value.toString(2).length);
  let estimate = 1n << ((bitLength + degree - 1n) / degree);
  while (true) {
    const next = ((degree - 1n) * estimate + value / estimate ** (degree - 1n)) / degree;
    if (next >= estimate) return estimate;
    estimate = next;
  }
}

/** Exact integer root if `value` is a perfect `degree`-th power, otherwise null. */
export function exactIntegerRoot(value: bigint, degree: bigint): bigint | null {
  const root = integerRootFloor(value, degree);
  return root ** degree === value ? root : null;
}

// Trial division stops here so huge inputs can't freeze the UI. Any leftover cofactor is
// treated as if it were prime, which keeps results correct but possibly less simplified.
const TRIAL_DIVISION_LIMIT = 100_000n;

/**
 * Factor a positive integer into primes.
 *
 * Args:
 *   value: integer >= 1
 *
 * Returns:
 *   Map of prime -> exponent. A leftover factor above the trial-division limit appears as one entry.
 */
export function factorize(value: bigint): Map<bigint, bigint> {
  const factors = new Map<bigint, bigint>();
  let remaining = absBig(value);
  const addFactor = (prime: bigint) => factors.set(prime, (factors.get(prime) ?? 0n) + 1n);
  for (let divisor = 2n; divisor * divisor <= remaining && divisor <= TRIAL_DIVISION_LIMIT; divisor++) {
    while (remaining % divisor === 0n) {
      addFactor(divisor);
      remaining /= divisor;
    }
  }
  if (remaining > 1n) addFactor(remaining);
  return factors;
}

// Rational-root search enumerates divisors; past this count the search is skipped to stay responsive.
const MAX_DIVISOR_COUNT = 5000;

/** All positive divisors of `value`, or null if there are too many to enumerate cheaply. */
export function positiveDivisors(value: bigint): bigint[] | null {
  let divisors: bigint[] = [1n];
  for (const [prime, exponent] of factorize(value)) {
    const extended: bigint[] = [];
    for (const divisor of divisors) {
      let power = 1n;
      for (let k = 0n; k <= exponent; k++) {
        extended.push(divisor * power);
        power *= prime;
      }
    }
    divisors = extended;
    if (divisors.length > MAX_DIVISOR_COUNT) return null;
  }
  return divisors.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Write value as base^exponent with the largest possible exponent (e.g. 64 -> 2^6, 12 -> 12^1).
 * Used for exact logarithms: log_4(8) = 3/2 because 8 = 2^3 and 4 = 2^2.
 */
export function perfectPowerDecomposition(value: bigint): { base: bigint; exponent: bigint } {
  if (value < 2n) return { base: value, exponent: 1n };
  let exponentGcd = 0n;
  for (const exponent of factorize(value).values()) exponentGcd = gcdBig(exponentGcd, exponent);
  const base = exactIntegerRoot(value, exponentGcd) ?? value;
  return base === value ? { base: value, exponent: 1n } : { base, exponent: exponentGcd };
}
