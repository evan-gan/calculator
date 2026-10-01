import type { Expr } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';
import { absBig } from '../number/integer';
import type { Rational } from '../number/rational';

// Decimal display. Rationals are converted digit-by-digit with BigInt (so 1/3 shows
// exactly 0.333333333333); everything else goes through a float evaluation.

export const SIGNIFICANT_DIGITS = 12;

// Float noise like 1.2e-16 from sin(π)-style evaluation should read as 0.
const FLOAT_NOISE = 1e-13;

/** "1.5e+21" -> "1.5\times10^{21}"; trims trailing zeros. */
function scientificToLatex(mantissa: string, exponent: number): string {
  return exponent === 0 ? mantissa : `${mantissa}\\times10^{${exponent}}`;
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

export function floatToLatex(value: number): string {
  if (Number.isNaN(value)) return '\\text{undefined}';
  if (!Number.isFinite(value)) return value > 0 ? '\\infty' : '-\\infty';
  if (Math.abs(value) < FLOAT_NOISE) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  if (magnitude >= SIGNIFICANT_DIGITS || magnitude < -6) {
    const [mantissa, exponent] = value.toExponential(SIGNIFICANT_DIGITS - 1).split('e');
    return scientificToLatex(trimZeros(mantissa), Number(exponent));
  }
  return trimZeros(value.toPrecision(SIGNIFICANT_DIGITS));
}

/** Exact decimal digits of a rational, rounded to SIGNIFICANT_DIGITS. */
export function rationalToDecimalLatex(value: Rational): string {
  if (value.isZero()) return '0';
  const sign = value.isNegative() ? '-' : '';
  const numerator = absBig(value.numerator);
  const denominator = value.denominator;
  // exponent = floor(log10(n/d)). The digit-count difference is either right or one too high.
  let exponent = numerator.toString().length - denominator.toString().length;
  const reachesPower =
    exponent >= 0 ? numerator >= denominator * 10n ** BigInt(exponent) : numerator * 10n ** BigInt(-exponent) >= denominator;
  if (!reachesPower) exponent--;
  const shift = SIGNIFICANT_DIGITS - 1 - exponent;
  const scaledNumerator = shift >= 0 ? numerator * 10n ** BigInt(shift) : numerator;
  const scaledDenominator = shift >= 0 ? denominator : denominator * 10n ** BigInt(-shift);
  // Round half up on the last kept digit.
  let digits = (scaledNumerator * 2n + scaledDenominator) / (scaledDenominator * 2n);
  if (digits.toString().length > SIGNIFICANT_DIGITS) {
    digits /= 10n;
    exponent++;
  }
  const digitText = digits.toString();
  if (exponent >= SIGNIFICANT_DIGITS || exponent < -6) {
    const mantissa = trimZeros(`${digitText[0]}.${digitText.slice(1)}`);
    return sign + scientificToLatex(mantissa, exponent);
  }
  let plain: string;
  if (exponent >= 0) {
    plain = `${digitText.slice(0, exponent + 1)}.${digitText.slice(exponent + 1)}`;
  } else {
    plain = `0.${'0'.repeat(-exponent - 1)}${digitText}`;
  }
  return sign + trimZeros(plain);
}

export function exprToDecimalLatex(expr: Expr): string {
  return expr.type === 'num' ? rationalToDecimalLatex(expr.value) : floatToLatex(evaluate(expr));
}
