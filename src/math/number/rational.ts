import { MathError } from '../errors';
import { absBig, gcdBig } from './integer';

// Above this many bits, Number() overflows to Infinity, so toNumber() scales both parts down first.
const SAFE_FLOAT_BITS = 1000n;

/**
 * Exact rational number n/d backed by BigInt.
 * Always stored reduced with a positive denominator, so equal values have identical fields.
 */
export class Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;

  static readonly ZERO = new Rational(0n);
  static readonly ONE = new Rational(1n);
  static readonly MINUS_ONE = new Rational(-1n);
  static readonly HALF = new Rational(1n, 2n);

  constructor(numerator: bigint, denominator: bigint = 1n) {
    if (denominator === 0n) throw new MathError('Division by zero is undefined.');
    if (denominator < 0n) {
      numerator = -numerator;
      denominator = -denominator;
    }
    const divisor = gcdBig(numerator, denominator) || 1n;
    this.numerator = numerator / divisor;
    this.denominator = denominator / divisor;
  }

  static fromInt(value: number | bigint): Rational {
    return new Rational(BigInt(value));
  }

  /** Parse a decimal string like "0.125" or "-3" straight from text, so 0.1 is exactly 1/10. */
  static parse(text: string): Rational {
    const match = text.match(/^(-?)(\d*)\.?(\d*)$/);
    if (!match || (match[2] === '' && match[3] === '')) {
      throw new MathError(`"${text}" is not a valid number.`);
    }
    const [, sign, integerPart, fractionPart] = match;
    const digits = BigInt((integerPart || '0') + fractionPart);
    return new Rational(sign ? -digits : digits, 10n ** BigInt(fractionPart.length));
  }

  add(other: Rational): Rational {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  sub(other: Rational): Rational {
    return this.add(other.neg());
  }

  mul(other: Rational): Rational {
    return new Rational(this.numerator * other.numerator, this.denominator * other.denominator);
  }

  div(other: Rational): Rational {
    if (other.isZero()) throw new MathError('Division by zero is undefined.');
    return new Rational(this.numerator * other.denominator, this.denominator * other.numerator);
  }

  neg(): Rational {
    return new Rational(-this.numerator, this.denominator);
  }

  inverse(): Rational {
    return Rational.ONE.div(this);
  }

  /** Integer power only; fractional powers are radicals and live in operations/power. */
  pow(exponent: bigint): Rational {
    if (exponent < 0n) return this.inverse().pow(-exponent);
    return new Rational(this.numerator ** exponent, this.denominator ** exponent);
  }

  abs(): Rational {
    return this.isNegative() ? this.neg() : this;
  }

  isZero(): boolean {
    return this.numerator === 0n;
  }

  isOne(): boolean {
    return this.numerator === 1n && this.denominator === 1n;
  }

  isInteger(): boolean {
    return this.denominator === 1n;
  }

  isNegative(): boolean {
    return this.numerator < 0n;
  }

  equals(other: Rational): boolean {
    return this.numerator === other.numerator && this.denominator === other.denominator;
  }

  compare(other: Rational): number {
    const difference = this.numerator * other.denominator - other.numerator * this.denominator;
    return difference < 0n ? -1 : difference > 0n ? 1 : 0;
  }

  /** Floor division result, e.g. floor(7/2) = 3, floor(-7/2) = -4. */
  floor(): bigint {
    const quotient = this.numerator / this.denominator;
    return this.numerator < 0n && quotient * this.denominator !== this.numerator ? quotient - 1n : quotient;
  }

  toNumber(): number {
    let numerator = this.numerator;
    let denominator = this.denominator;
    const bits = BigInt(Math.max(absBig(numerator).toString(2).length, denominator.toString(2).length));
    if (bits > SAFE_FLOAT_BITS) {
      const shift = bits - SAFE_FLOAT_BITS;
      numerator >>= shift;
      denominator >>= shift;
      if (denominator === 0n) return numerator < 0n ? -Infinity : Infinity;
    }
    return Number(numerator) / Number(denominator);
  }

  toString(): string {
    return this.denominator === 1n ? `${this.numerator}` : `${this.numerator}/${this.denominator}`;
  }
}
