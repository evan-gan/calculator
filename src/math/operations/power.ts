import { isConstantExpr, toKey } from '../ast/inspect';
import { num, ONE, pow, type Expr, type PowerNode, type ProductNode, type SumNode } from '../ast/nodes';
import { MathError } from '../errors';
import { numericSign } from '../evaluate/evaluate';
import { absBig } from '../number/integer';
import { Rational } from '../number/rational';
import { powerExpanded } from './expand';
import { simplifyFunctionCall } from './functions/apply';
import { simplifyProduct } from './multiply';
import { denestSquareRoot, rationalizeReciprocal } from './rationalize';
import { isPositiveConstant } from './sign';

// Exact results bigger than this many bits would freeze the page, so we refuse them.
const MAX_RESULT_BITS = 100_000;
// (a + b√c)^n is expanded only for small n to keep results readable.
const MAX_EXPANSION_POWER = 16;

/** Simplify base^exponent where both parts are already simplified. */
export function simplifyPower(base: Expr, exponent: Expr): Expr {
  if (exponent.type === 'num') {
    if (exponent.value.isZero()) {
      if (base.type === 'num' && base.value.isZero()) throw new MathError('0⁰ is undefined.');
      return ONE;
    }
    if (exponent.value.isOne()) return base;
  }
  switch (base.type) {
    case 'num':
      return powerOfNumber(base.value, exponent);
    case 'pow':
      return powerOfPower(base, exponent);
    case 'mul':
      return powerOfProduct(base, exponent);
    case 'add':
      return powerOfSum(base, exponent) ?? pow(base, exponent);
    case 'const':
      return (base.name === 'e' && undoNaturalLog(exponent)) || pow(base, exponent);
    case 'func':
      // |x|^2 = x^2 for any even power
      if (base.name === 'abs' && isEvenInteger(exponent)) return simplifyPower(base.args[0], exponent);
      return pow(base, exponent);
    default:
      return pow(base, exponent);
  }
}

function isEvenInteger(expr: Expr): boolean {
  return expr.type === 'num' && expr.value.isInteger() && expr.value.numerator % 2n === 0n;
}

function bitLength(value: bigint): number {
  return absBig(value).toString(2).length;
}

function assertResultSize(base: Rational, exponent: Rational): void {
  const bits = (bitLength(base.numerator) + bitLength(base.denominator)) * Math.abs(exponent.toNumber());
  if (bits > MAX_RESULT_BITS) {
    throw new MathError('That exact result is too large to compute. Try a smaller exponent.');
  }
}

function powerOfNumber(value: Rational, exponent: Expr): Expr {
  if (value.isZero()) {
    if (exponent.type !== 'num') return pow(num(value), exponent);
    if (exponent.value.isNegative()) throw new MathError('Division by zero is undefined.');
    return num(0);
  }
  if (value.isOne()) return ONE;
  if (exponent.type !== 'num') {
    // b^(log_b(y)) = y
    if (exponent.type === 'func' && exponent.name === 'log' && toKey(exponent.args[1]) === value.toString()) {
      return exponent.args[0];
    }
    return pow(num(value), exponent);
  }
  const power = exponent.value;
  assertResultSize(value, power);
  if (power.isInteger()) return num(value.pow(power.numerator));
  if (value.isNegative()) {
    if (power.denominator % 2n === 0n) {
      throw new MathError('Even roots of negative numbers are not real numbers (this calculator works over the reals).');
    }
    // An odd root keeps the sign: (-8)^(1/3) = -2, (-8)^(2/3) = 4
    const sign = power.numerator % 2n === 0n ? 1 : -1;
    return simplifyProduct([num(sign), pow(num(value.neg()), exponent)]);
  }
  // multiply.ts owns radical normalization (√72 = 6√2), so hand the raw radical to it.
  return simplifyProduct([pow(num(value), exponent)]);
}

function powerOfPower(base: PowerNode, outerExponent: Expr): Expr {
  const innerExponent = base.exponent;
  const outerIsInteger = outerExponent.type === 'num' && outerExponent.value.isInteger();
  if (outerIsInteger || isPositiveConstant(base.base)) {
    return simplifyPower(base.base, simplifyProduct([innerExponent, outerExponent]));
  }
  // Odd roots of reals are multiplicative, so exponents just multiply: (x³)^(1/3) = x, (x²)^(1/3) = x^(2/3)
  if (outerExponent.type === 'num' && innerExponent.type === 'num' && outerExponent.value.denominator % 2n !== 0n) {
    return simplifyPower(base.base, num(innerExponent.value.mul(outerExponent.value)));
  }
  // (x^2)^(1/2) = |x|, because squaring loses the sign
  if (isEvenInteger(innerExponent) && innerExponent.type === 'num' && outerExponent.type === 'num') {
    const combined = innerExponent.value.mul(outerExponent.value);
    const needsAbs = combined.numerator % 2n !== 0n;
    const newBase = needsAbs ? simplifyFunctionCall('abs', [base.base]) : base.base;
    return simplifyPower(newBase, num(combined));
  }
  return pow(base, outerExponent);
}

function powerOfProduct(product: ProductNode, exponent: Expr): Expr {
  if (exponent.type !== 'num') return pow(product, exponent);
  if (exponent.value.isInteger()) {
    return simplifyProduct(product.factors.map((factor) => simplifyPower(factor, exponent)));
  }
  // (c·y)^r = c^r · y^r is only safe for positive c, or for negative c when the root is odd.
  const oddRoot = exponent.value.denominator % 2n !== 0n;
  const pulledOut: Expr[] = [];
  const kept: Expr[] = [];
  for (const factor of product.factors) {
    if (isPositiveConstant(factor) || leavesRoot(factor, exponent.value)) {
      pulledOut.push(simplifyPower(factor, exponent));
    } else if (oddRoot && factor.type === 'num' && factor.value.isNegative()) {
      pulledOut.push(simplifyPower(factor, exponent));
    } else {
      kept.push(factor);
    }
  }
  if (pulledOut.length === 0) return pow(product, exponent);
  if (kept.length === 1) pulledOut.push(simplifyPower(kept[0], exponent));
  if (kept.length > 1) pulledOut.push(pow({ type: 'mul', factors: kept }, exponent));
  return simplifyProduct(pulledOut);
}

/**
 * True when a power b^n can come out of a root whole: √(x²y) = |x|√y, ∛(x³y) = x∛y.
 * Even roots need n even (x² ≥ 0); odd roots work for any sign. Partial results like
 * (x²)^(1/4) = √|x| are left inside, since they don't read any simpler.
 */
function leavesRoot(factor: Expr, rootExponent: Rational): boolean {
  if (factor.type !== 'pow' || factor.exponent.type !== 'num' || !factor.exponent.value.isInteger()) return false;
  const power = factor.exponent.value;
  const evenRoot = rootExponent.denominator % 2n === 0n;
  if (evenRoot && power.numerator % 2n !== 0n) return false;
  return power.mul(rootExponent).isInteger();
}

function powerOfSum(sum: SumNode, exponent: Expr): Expr | null {
  if (!isConstantExpr(sum) || exponent.type !== 'num') return null;
  const power = exponent.value;
  if (power.isInteger() && power.numerator > 0n && power.numerator <= MAX_EXPANSION_POWER) {
    return powerExpanded(sum, power.numerator);
  }
  if (power.isInteger() && power.numerator < 0n) {
    const reciprocal = rationalizeReciprocal(sum);
    return reciprocal ? simplifyPower(reciprocal, num(power.neg())) : null;
  }
  if (power.equals(Rational.HALF)) {
    const denested = denestSquareRoot(sum);
    if (denested) return denested;
  }
  // Odd roots of negative constants: ∛(1 - √2) = -∛(√2 - 1)
  if (!power.isInteger() && power.denominator % 2n !== 0n && numericSign(sum) === -1) {
    const sign = power.numerator % 2n === 0n ? 1 : -1;
    const positiveSum = simplifyProduct([num(-1), sum]);
    return simplifyProduct([num(sign), simplifyPower(positiveSum, exponent)]);
  }
  return null;
}

/** e^(ln y) = y and e^(c·ln y) = y^c. */
function undoNaturalLog(exponent: Expr): Expr | null {
  if (exponent.type === 'func' && exponent.name === 'ln') return exponent.args[0];
  if (exponent.type === 'mul' && exponent.factors.length === 2 && exponent.factors[0].type === 'num') {
    const [coefficient, logTerm] = exponent.factors;
    if (logTerm.type === 'func' && logTerm.name === 'ln') return simplifyPower(logTerm.args[0], coefficient);
  }
  return null;
}

