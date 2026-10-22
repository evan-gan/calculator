import { isCalculusOperator } from '../ast/calculus';
import type { Expr, FunctionNode } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';
import { absBig } from '../number/integer';
import type { Rational } from '../number/rational';

// Decimal display. Rationals are converted digit-by-digit with BigInt (so 1/3 shows
// exactly 0.333333333333); everything else goes through a float evaluation.

export const SIGNIFICANT_DIGITS = 12;

/** 'decimal' switches to a×10ⁿ only for very large/small numbers; 'scientific' always does. */
export type NumberNotation = 'decimal' | 'scientific';

// Float noise like 1.2e-16 from sin(π)-style evaluation should read as 0. The cut-off is
// relative to the size of the numbers that produced the value, so a genuinely tiny answer
// like (1029 − 588√3)/(6.4×10¹⁴) ≈ 1.6×10⁻¹⁴ still shows its digits.
const RELATIVE_FLOAT_NOISE = 1e-13;

/** "1.5e+21" -> "1.5\times10^{21}". Keeps ×10⁰ so scientific answers all share one shape. */
function scientificToLatex(mantissa: string, exponent: number): string {
  return `${mantissa}\\times10^{${exponent}}`;
}

function usesScientific(exponent: number, notation: NumberNotation): boolean {
  return notation === 'scientific' || exponent >= SIGNIFICANT_DIGITS || exponent < -6;
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/**
 * Float value → LaTeX text.
 *
 * Args:
 *   value: the number to print
 *   notation: plain decimals or a×10ⁿ
 *   noiseScale: size of the numbers the value was computed from (see `floatNoiseScale`);
 *     values this much smaller than it are rounding error and print as 0
 */
export function floatToLatex(value: number, notation: NumberNotation = 'decimal', noiseScale = 1): string {
  if (Number.isNaN(value)) return '\\text{undefined}';
  if (!Number.isFinite(value)) return value > 0 ? '\\infty' : '-\\infty';
  if (Math.abs(value) < RELATIVE_FLOAT_NOISE * noiseScale) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  if (usesScientific(magnitude, notation)) {
    const [mantissa, exponent] = value.toExponential(SIGNIFICANT_DIGITS - 1).split('e');
    return scientificToLatex(trimZeros(mantissa), Number(exponent));
  }
  return trimZeros(value.toPrecision(SIGNIFICANT_DIGITS));
}

/** Exact decimal digits of a rational, rounded to SIGNIFICANT_DIGITS. */
export function rationalToDecimalLatex(value: Rational, notation: NumberNotation = 'decimal'): string {
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
  if (usesScientific(exponent, notation)) {
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

/**
 * How large the rounding error in evaluate(expr) can be, up to a factor of about 1e-16:
 * sums add up the sizes of their terms (cancellation is where noise appears), products
 * multiply them, and function calls follow their argument (`functionNoiseScale`).
 */
export function floatNoiseScale(expr: Expr): number {
  switch (expr.type) {
    case 'add':
      return expr.terms.reduce((total, term) => total + floatNoiseScale(term), 0);
    case 'mul':
      return expr.factors.reduce((total, factor) => total * floatNoiseScale(factor), 1);
    case 'pow': {
      const exponent = evaluate(expr.exponent);
      // A negative power divides; cancellation in a denominator doesn't make the result tiny.
      return exponent > 0 ? floatNoiseScale(expr.base) ** exponent : Math.abs(evaluate(expr));
    }
    case 'func':
      return functionNoiseScale(expr);
    default:
      return Math.abs(evaluate(expr));
  }
}

/**
 * Rounding error of f(u) comes mostly from the error already in u: sin(π) is noise because
 * π is size 3, while sin(10⁻²⁰) is a real answer because its argument is that small too.
 * ln(u) magnifies its argument's error by 1/|u|. Calculus operators count as size 1, since
 * re-evaluating them could rerun a slow numeric integral.
 */
function functionNoiseScale(call: FunctionNode): number {
  if (isCalculusOperator(call.name)) return 1;
  const argumentScale = floatNoiseScale(call.args[0]);
  if (call.name === 'ln' || call.name === 'log') return argumentScale / Math.abs(evaluate(call.args[0]));
  return Math.max(Math.abs(evaluate(call)), argumentScale);
}

/** Float evaluation of a variable-free expression, printed with noise judged against its own terms. */
export function constantToFloatLatex(expr: Expr, notation: NumberNotation = 'decimal'): string {
  return floatToLatex(evaluate(expr), notation, floatNoiseScale(expr));
}

export function exprToDecimalLatex(expr: Expr, notation: NumberNotation = 'decimal'): string {
  return expr.type === 'num' ? rationalToDecimalLatex(expr.value, notation) : constantToFloatLatex(expr, notation);
}
