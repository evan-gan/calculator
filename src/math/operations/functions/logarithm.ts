import { isConstantExpr, toKey } from '../../ast/inspect';
import { divide, E, func, mul, num, pow, subtract, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { numericSign } from '../../evaluate/evaluate';
import { factorize } from '../../number/integer';
import { Rational } from '../../number/rational';
import type { FunctionDefinition } from './types';

// ln(x) and log_b(x). Exact when the argument is a power of the base:
// log_4(8) = 3/2 because 8 = 2^3 and 4 = 2^2.

type PrimeExponents = Map<bigint, Rational>;

function addPrimeExponents(target: PrimeExponents, value: Rational, exponent: Rational): void {
  const add = (part: bigint, sign: bigint) => {
    for (const [prime, multiplicity] of factorize(part)) {
      const contribution = exponent.mul(Rational.fromInt(multiplicity * sign));
      target.set(prime, (target.get(prime) ?? Rational.ZERO).add(contribution));
    }
  };
  add(value.numerator, 1n);
  add(value.denominator, -1n);
}

/**
 * Prime factorization with rational exponents for positive numbers built from rationals and
 * radicals, e.g. 2√2 -> {2: 3/2}. Returns null for anything else (π, sums, negatives).
 */
function primeExponentsOf(expr: Expr): PrimeExponents | null {
  const result: PrimeExponents = new Map();
  const factors = expr.type === 'mul' ? expr.factors : [expr];
  for (const factor of factors) {
    if (factor.type === 'num' && !factor.value.isNegative() && !factor.value.isZero()) {
      addPrimeExponents(result, factor.value, Rational.ONE);
    } else if (factor.type === 'pow' && factor.base.type === 'num' && factor.exponent.type === 'num' && !factor.base.value.isNegative()) {
      addPrimeExponents(result, factor.base.value, factor.exponent.value);
    } else {
      return null;
    }
  }
  return result;
}

/** k with argument = base^k when both factor over the same primes in the same proportions. */
function exactLogFromPrimes(argument: Expr, base: Expr): Rational | null {
  const argumentPrimes = primeExponentsOf(argument);
  const basePrimes = primeExponentsOf(base);
  if (!argumentPrimes || !basePrimes) return null;
  const nonZero = (primes: PrimeExponents) => [...primes].filter(([, exponent]) => !exponent.isZero());
  const argumentEntries = nonZero(argumentPrimes);
  const baseEntries = nonZero(basePrimes);
  if (baseEntries.length === 0 || argumentEntries.length !== baseEntries.length) return null;
  let ratio: Rational | null = null;
  for (const [prime, baseExponent] of baseEntries) {
    const argumentExponent = argumentPrimes.get(prime);
    if (!argumentExponent || argumentExponent.isZero()) return null;
    const current = argumentExponent.div(baseExponent);
    if (ratio && !ratio.equals(current)) return null;
    ratio = current;
  }
  return ratio;
}

function assertValidLog(argument: Expr, base: Expr): void {
  if (isConstantExpr(argument) && numericSign(argument) !== 1) {
    throw new MathError('Logarithms are only defined for positive numbers.');
  }
  if (isConstantExpr(base) && (numericSign(base) !== 1 || (base.type === 'num' && base.value.isOne()))) {
    throw new MathError('A logarithm base must be positive and not equal to 1.');
  }
}

/** Exact log_base(argument) as an unsimplified tree, or null when no exact rule applies. */
export function exactLogarithm(argument: Expr, base: Expr): Expr | null {
  assertValidLog(argument, base);
  if (argument.type === 'num' && argument.value.isOne()) return num(0);
  if (toKey(argument) === toKey(base)) return num(1);
  // log_b(b^y) = y
  if (argument.type === 'pow' && toKey(argument.base) === toKey(base)) return argument.exponent;
  // log_4(8) = 3/2, log_2(2√2) = 3/2: compare prime factorizations.
  const exact = exactLogFromPrimes(argument, base);
  return exact ? num(exact) : null;
}

export const lnDefinition: FunctionDefinition = {
  name: 'ln',
  latex: '\\ln',
  arity: 1,
  simplify: ([argument]) => exactLogarithm(argument, E),
  evaluate: ([argument]) => (argument > 0 ? Math.log(argument) : NaN),
  derivative: ([argument], [rate]) => divide(rate, argument),
};

export const logDefinition: FunctionDefinition = {
  name: 'log',
  latex: '\\log',
  arity: 2,
  simplify: ([argument, base]) => exactLogarithm(argument, base),
  evaluate: ([argument, base]) => (argument > 0 && base > 0 && base !== 1 ? Math.log(argument) / Math.log(base) : NaN),
  // log_b(u) = ln u / ln b, by the quotient rule; with a constant base this simplifies to u'/(u ln b).
  derivative: ([argument, base], [argumentRate, baseRate]) => {
    const lnBase = func('ln', base);
    const top = subtract(mul(divide(argumentRate, argument), lnBase), mul(func('ln', argument), divide(baseRate, base)));
    return divide(top, pow(lnBase, num(2)));
  },
};
