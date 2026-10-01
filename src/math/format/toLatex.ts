import { isCalculusOperator } from '../ast/calculus';
import { containsVariable, toKey } from '../ast/inspect';
import { num, type ElementaryFunctionName, type Expr, type FunctionName, type FunctionNode, type PowerNode, type ProductNode, type SumNode } from '../ast/nodes';
import { lcmBig } from '../number/integer';
import type { Rational } from '../number/rational';
import { negated, powerOf, productOf } from '../operations/arithmetic';
import { splitCoefficient } from '../operations/add';
import { getFunction } from '../operations/functions/registry';
import { hasNegativeSign } from '../operations/sign';
import { calculusToLatex } from './calculusToLatex';

// Prints simplified expression trees as LaTeX for MathQuill's static renderer.

const TRIG_NAMES = new Set<FunctionName>(['sin', 'cos', 'tan', 'sec', 'csc', 'cot']);

const INVERSE_TRIG_NAMES = new Set<FunctionName>(['arcsin', 'arccos', 'arctan']);

// Printed as sin⁻¹(x), so a power of one needs parentheses to not read as a reciprocal
function isInverseTrigName(name: FunctionName): boolean {
  return INVERSE_TRIG_NAMES.has(name);
}

function isTrigName(name: FunctionName): name is ElementaryFunctionName {
  return TRIG_NAMES.has(name);
}

export function rationalToLatex(value: Rational): string {
  if (value.isInteger()) return value.numerator.toString();
  const sign = value.isNegative() ? '-' : '';
  return `${sign}\\frac{${value.abs().numerator}}{${value.denominator}}`;
}

export function toLatex(expr: Expr): string {
  switch (expr.type) {
    case 'num':
      return rationalToLatex(expr.value);
    case 'const':
      return expr.name === 'pi' ? '\\pi' : expr.name === 'e' ? 'e' : '\\infty';
    case 'var':
      return expr.name;
    case 'add':
      return sumToLatex(expr);
    case 'mul':
      return productToLatex(expr);
    case 'pow':
      return powerToLatex(expr);
    case 'func':
      return functionToLatex(expr);
  }
}

function wrapInParens(latex: string): string {
  return `\\left(${latex}\\right)`;
}

/**
 * Avoid a leading minus where possible: "√6 - √2" rather than "-√2 + √6", and "x - 1"
 * stays as is. Constant sums put positive terms first; other sums only move a leading
 * negative number to the end.
 */
function displayOrder(terms: Expr[]): Expr[] {
  if (!terms.some((term) => containsVariable(term))) {
    return [...terms.filter((term) => !hasNegativeSign(term)), ...terms.filter(hasNegativeSign)];
  }
  const [first, ...rest] = terms;
  if (first.type === 'num' && first.value.isNegative() && rest.some((term) => !hasNegativeSign(term))) {
    return [...rest, first];
  }
  return terms;
}

function joinTerms(terms: Expr[]): string {
  return displayOrder(terms)
    .map((term, index) => {
      if (index === 0) return toLatex(term);
      return hasNegativeSign(term) ? `-${toLatex(negated(term))}` : `+${toLatex(term)}`;
    })
    .join('');
}

/**
 * Powers with negative exponents that every term shares, at the smallest shared size:
 * 4/e + √2/(2e) shares e, so it can print over one denominator.
 */
function sharedDenominatorFactors(terms: Expr[]): Expr[] {
  const negativePowersPerTerm = terms.map((term) => {
    const powers = new Map<string, { base: Expr; size: Rational }>();
    for (const factor of splitCoefficient(term).rest) {
      if (hasNegativeExponent(factor) && factor.exponent.type === 'num') {
        powers.set(toKey(factor.base), { base: factor.base, size: factor.exponent.value.neg() });
      }
    }
    return powers;
  });
  const [first, ...others] = negativePowersPerTerm;
  const shared: Expr[] = [];
  for (const [key, { base, size }] of first) {
    let smallest = size;
    let inEveryTerm = true;
    for (const powers of others) {
      const match = powers.get(key);
      if (!match) inEveryTerm = false;
      else if (match.size.compare(smallest) < 0) smallest = match.size;
    }
    if (inEveryTerm) shared.push(powerOf(base, num(smallest)));
  }
  return shared;
}

/**
 * Sums whose terms share a denominator print as one fraction:
 * √6/4 - √2/4 becomes (√6 - √2)/4 and 4/e + √2/(2e) becomes (8 + √2)/(2e).
 * Rational denominators are only combined for constant sums so x/2 + 1 stays readable.
 */
function sumToLatex(sum: SumNode): string {
  const rationalDenominator = containsVariable(sum)
    ? 1n
    : sum.terms.reduce((lcm, term) => lcmBig(lcm, splitCoefficient(term).coefficient.denominator), 1n);
  const sharedFactors = sharedDenominatorFactors(sum.terms);
  if (rationalDenominator === 1n && sharedFactors.length === 0) return joinTerms(sum.terms);
  const denominator = productOf(num(rationalDenominator), ...sharedFactors);
  const scaled = sum.terms.map((term) => productOf(denominator, term));
  return `\\frac{${joinTerms(scaled)}}{${toLatex(denominator)}}`;
}

function isCalculusCall(expr: Expr): boolean {
  return expr.type === 'func' && isCalculusOperator(expr.name);
}

function factorToLatex(factor: Expr): string {
  return factor.type === 'add' || isCalculusCall(factor) ? wrapInParens(toLatex(factor)) : toLatex(factor);
}

/** Juxtapose factors, using \cdot only where two numbers would otherwise run together (2·3^x). */
function joinFactors(factors: Expr[]): string {
  let latex = '';
  for (const factor of factors) {
    const piece = factorToLatex(factor);
    const needsDot = latex !== '' && /^[0-9.]/.test(piece);
    latex += needsDot ? `\\cdot ${piece}` : latex === '' ? piece : ` ${piece}`;
  }
  return latex;
}

function hasNegativeExponent(factor: Expr): factor is PowerNode {
  return factor.type === 'pow' && factor.exponent.type === 'num' && factor.exponent.value.isNegative();
}

function productToLatex(product: ProductNode): string {
  const { coefficient, rest } = splitCoefficient(product);
  const sign = coefficient.isNegative() ? '-' : '';
  const magnitude = coefficient.abs();
  const numeratorFactors = rest.filter((factor) => !hasNegativeExponent(factor));
  const denominatorFactors = rest
    .filter(hasNegativeExponent)
    .map((factor) => powerOf(factor.base, negated(factor.exponent)));

  const topFactors = magnitude.numerator !== 1n || numeratorFactors.length === 0
    ? [num(magnitude.numerator), ...numeratorFactors]
    : numeratorFactors;
  if (magnitude.denominator === 1n && denominatorFactors.length === 0) return sign + joinFactors(topFactors);

  const bottomFactors = magnitude.denominator !== 1n ? [num(magnitude.denominator), ...denominatorFactors] : denominatorFactors;
  // Inside a fraction bar, sums don't need parentheses unless multiplied by something else.
  const top = topFactors.length === 1 ? toLatex(topFactors[0]) : joinFactors(topFactors);
  const bottom = bottomFactors.length === 1 ? toLatex(bottomFactors[0]) : joinFactors(bottomFactors);
  return `${sign}\\frac{${top}}{${bottom}}`;
}

function needsParensAsBase(base: Expr): boolean {
  if (base.type === 'num') return base.value.isNegative() || !base.value.isInteger();
  if (base.type === 'func') return base.name === 'factorial' || isCalculusOperator(base.name) || isInverseTrigName(base.name);
  return base.type === 'add' || base.type === 'mul' || base.type === 'pow';
}

function powerToLatex(power: PowerNode): string {
  const { base, exponent } = power;
  if (exponent.type === 'num') {
    const value = exponent.value;
    if (value.isNegative()) return `\\frac{1}{${toLatex(powerOf(base, num(value.neg())))}}`;
    if (!value.isInteger()) return rootToLatex(base, value);
    if (base.type === 'func' && isTrigName(base.name)) {
      return `${getFunction(base.name).latex}^{${value.numerator}}${wrapInParens(toLatex(base.args[0]))}`;
    }
  }
  const baseLatex = needsParensAsBase(base) ? wrapInParens(toLatex(base)) : toLatex(base);
  return `${baseLatex}^{${toLatex(exponent)}}`;
}

function rootToLatex(base: Expr, exponent: Rational): string {
  const index = exponent.denominator === 2n ? '' : `[${exponent.denominator}]`;
  if (exponent.numerator === 1n) return `\\sqrt${index}{${toLatex(base)}}`;
  if (base.type === 'num') return `\\sqrt${index}{${toLatex(base)}^{${exponent.numerator}}}`;
  const baseLatex = needsParensAsBase(base) ? wrapInParens(toLatex(base)) : toLatex(base);
  return `${baseLatex}^{${rationalToLatex(exponent)}}`;
}

function functionToLatex(call: FunctionNode): string {
  if (isCalculusOperator(call.name)) return calculusToLatex(call);
  const [argument, secondArgument] = call.args;
  switch (call.name) {
    case 'abs':
      return `\\left|${toLatex(argument)}\\right|`;
    case 'factorial': {
      const simple = argument.type === 'var' || (argument.type === 'num' && argument.value.isInteger() && !argument.value.isNegative());
      return `${simple ? toLatex(argument) : wrapInParens(toLatex(argument))}!`;
    }
    case 'log': {
      const isCommonLog = secondArgument.type === 'num' && secondArgument.value.numerator === 10n && secondArgument.value.isInteger();
      const base = isCommonLog ? '' : `_{${toLatex(secondArgument)}}`;
      return `\\log${base}${wrapInParens(toLatex(argument))}`;
    }
    case 'ln':
      // ln|x| rather than ln(|x|)
      if (argument.type === 'func' && argument.name === 'abs') return `\\ln${toLatex(argument)}`;
      return `\\ln${wrapInParens(toLatex(argument))}`;
    default:
      return `${getFunction(call.name).latex}${wrapInParens(toLatex(argument))}`;
  }
}

/** Expression for a ± pair printer: m ± d, sharing one fraction bar when both have denominators. */
export function plusMinusToLatex(center: Expr, offset: Expr): string {
  const centerCoefficient = splitCoefficient(center).coefficient;
  const offsetCoefficient = splitCoefficient(offset).coefficient;
  const isZeroCenter = center.type === 'num' && center.value.isZero();
  const commonDenominator = isZeroCenter
    ? offsetCoefficient.denominator
    : lcmBig(centerCoefficient.denominator, offsetCoefficient.denominator);
  if (commonDenominator === 1n || containsVariable(center) || containsVariable(offset)) {
    return isZeroCenter ? `\\pm ${toLatex(offset)}` : `${toLatex(center)}\\pm ${toLatex(offset)}`;
  }
  const scaledCenter = productOf(num(commonDenominator), center);
  const scaledOffset = productOf(num(commonDenominator), offset);
  const top = isZeroCenter ? `\\pm ${toLatex(scaledOffset)}` : `${toLatex(scaledCenter)}\\pm ${toLatex(scaledOffset)}`;
  return `\\frac{${top}}{${commonDenominator}}`;
}

