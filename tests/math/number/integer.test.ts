import { describe, expect, test } from 'vitest';
import {
  exactIntegerRoot,
  factorize,
  gcdBig,
  integerRootFloor,
  perfectPowerDecomposition,
  positiveDivisors,
} from '../../../src/math/number/integer';

describe('integer helpers', () => {
  test('gcd handles negatives and zero', () => {
    expect(gcdBig(-12n, 18n)).toBe(6n);
    expect(gcdBig(0n, 5n)).toBe(5n);
  });

  test('integer roots are exact for perfect powers and floor otherwise', () => {
    expect(exactIntegerRoot(1000n, 3n)).toBe(10n);
    expect(exactIntegerRoot(1001n, 3n)).toBeNull();
    expect(integerRootFloor(99n, 2n)).toBe(9n);
    expect(integerRootFloor(10n ** 40n, 2n)).toBe(10n ** 20n);
  });

  test('factorize returns prime exponents', () => {
    expect([...factorize(72n)]).toEqual([
      [2n, 3n],
      [3n, 2n],
    ]);
  });

  test('positiveDivisors lists every divisor in order', () => {
    expect(positiveDivisors(12n)).toEqual([1n, 2n, 3n, 4n, 6n, 12n]);
  });

  test('perfectPowerDecomposition finds the largest exponent', () => {
    expect(perfectPowerDecomposition(64n)).toEqual({ base: 2n, exponent: 6n });
    expect(perfectPowerDecomposition(12n)).toEqual({ base: 12n, exponent: 1n });
  });
});
