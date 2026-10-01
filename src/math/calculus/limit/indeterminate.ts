import { containsVariable, toKey } from '../../ast/inspect';
import { E, func, num, type Expr, type PowerNode, type SumNode } from '../../ast/nodes';
import { MathError } from '../../errors';
import { numericSign } from '../../evaluate/evaluate';
import { differenceOf, powerOf, productOf, quotientOf, reciprocalOf, sumOf } from '../../operations/arithmetic';
import { expandAll } from '../../operations/expand';
import { simplify } from '../../simplify/simplify';
import { derivativeOf } from '../differentiate';
import { dominantProduct, dominantSum } from './dominance';
import { UNKNOWN, finite, infinite, type FindLimit, type LimitContext, type LimitResult } from './types';

// Indeterminate forms. 0·∞ (which includes 0/0 and ∞/∞, since a quotient is a product with a
// negative power) is rewritten as a quotient and handed to L'Hôpital's rule; ∞ - ∞ is put over
// a common denominator, or multiplied by its conjugate when it holds a square root, which turns
// it into a quotient too.

// Rewrites in a row before giving up: enough for L'Hôpital applied a few times.
export const MAX_REWRITES = 6;

export const isZeroLimit = (result: LimitResult) =>
  result.kind === 'finite' && ((result.value.type === 'num' && result.value.value.isZero()) || numericSign(result.value) === 0);

/** The context for one more rewrite, or null once MAX_REWRITES have been made. */
export function deeper(context: LimitContext): LimitContext | null {
  return context.rewrites >= MAX_REWRITES ? null : { ...context, rewrites: context.rewrites + 1 };
}

/** lim top/bottom = lim top'/bottom' when both go to 0 or both to ±∞. */
function lHopital(top: Expr, bottom: Expr, context: LimitContext, findLimit: FindLimit): LimitResult {
  const next = deeper(context);
  if (!next) return UNKNOWN;
  const [topLimit, bottomLimit] = [findLimit(top, next), findLimit(bottom, next)];
  const bothZero = isZeroLimit(topLimit) && isZeroLimit(bottomLimit);
  const bothInfinite = topLimit.kind === 'infinite' && bottomLimit.kind === 'infinite';
  if (!bothZero && !bothInfinite) return UNKNOWN;
  try {
    const variable = context.approach.variable;
    const bottomRate = derivativeOf(bottom, variable);
    if (bottomRate.type === 'num' && bottomRate.value.isZero()) return UNKNOWN;
    const result = findLimit(quotientOf(derivativeOf(top, variable), bottomRate), next);
    // The rule only says something when top'/bottom' has a limit; oscillation proves nothing.
    return result.kind === 'bounded' ? UNKNOWN : result;
  } catch (error) {
    if (error instanceof MathError) return UNKNOWN;
    throw error;
  }
}

const isNegativePower = (factor: Expr) => factor.type === 'pow' && factor.exponent.type === 'num' && factor.exponent.value.isNegative();

type QuotientForm = { top: Expr; bottom: Expr; scale: Expr };

/**
 * Ways to write a 0·∞ product as top/bottom, best first: the quotient as written, then
 * (zero part)/(1/infinite part) and the reverse, the one with the simpler bottom first.
 * That keeps logarithms and trig on top, where L'Hôpital removes them: ln x/(1/x) works,
 * x/(1/ln x) only gets worse, and sin(1/n)/(1/n) beats n/(1/sin(1/n)).
 */
function quotientForms(factors: Expr[], results: LimitResult[], variable: string): QuotientForm[] {
  const forms: QuotientForm[] = [];
  const denominators = factors.filter(isNegativePower);
  if (denominators.some((factor) => containsVariable(factor, variable))) {
    forms.push({
      top: productOf(...factors.filter((factor) => !isNegativePower(factor))),
      bottom: reciprocalOf(productOf(...denominators)),
      scale: num(1),
    });
  }
  const zeros = factors.filter((_, index) => isZeroLimit(results[index]));
  const infinities = factors.filter((_, index) => results[index].kind === 'infinite');
  const scale = productOf(
    ...results.filter((result, index) => result.kind === 'finite' && !zeros.includes(factors[index])).map((result) => (result as { value: Expr }).value),
  );
  const [zeroPart, infinitePart] = [productOf(...zeros), productOf(...infinities)];
  const zeroOnTop = { top: zeroPart, bottom: reciprocalOf(infinitePart), scale };
  const infiniteOnTop = { top: infinitePart, bottom: reciprocalOf(zeroPart), scale };
  const size = (form: QuotientForm) => toKey(form.bottom).length;
  forms.push(...[zeroOnTop, infiniteOnTop].sort((first, second) => size(first) - size(second)));
  return forms;
}

function scaleResult(result: LimitResult, scale: Expr): LimitResult {
  if (result.kind === 'finite') return finite(productOf(result.value, scale));
  if (result.kind !== 'infinite') return result;
  const sign = numericSign(scale);
  return sign === 1 || sign === -1 ? infinite((result.sign * sign) as 1 | -1) : UNKNOWN;
}

/**
 * Limit of a product whose factors go to 0 and ±∞ at the same time: the growth hierarchy at ±∞,
 * merged exponentials, L'Hôpital on each quotient form, then multiplying out, which splits
 * (x + sin x)/x into 1 + sin x/x.
 */
export function resolveZeroTimesInfinity(factors: Expr[], results: LimitResult[], context: LimitContext, findLimit: FindLimit): LimitResult {
  const dominant = dominantProduct(factors, results, context);
  if (dominant) return dominant;
  const merged = mergeExponentials(factors, context.approach.variable);
  const next = deeper(context);
  if (merged && next) {
    const result = findLimit(merged, next);
    if (result.kind !== 'unknown') return result;
  }
  for (const { top, bottom, scale } of quotientForms(factors, results, context.approach.variable)) {
    const result = lHopital(top, bottom, context, findLimit);
    if (result.kind !== 'unknown') return scaleResult(result, scale);
  }
  const product = productOf(...factors);
  const expanded = expandAll(product);
  return next && toKey(expanded) !== toKey(product) ? findLimit(expanded, next) : UNKNOWN;
}

const isVaryingExponential = (factor: Expr, variable: string) =>
  factor.type === 'pow' && !containsVariable(factor.base, variable) && containsVariable(factor.exponent, variable);

/**
 * Several exponentials with constant bases as one: 2ˣ·3^(-x) = e^(x ln 2 - x ln 3). Their
 * exponents then compete inside one sum, where the growth rules can compare them.
 */
function mergeExponentials(factors: Expr[], variable: string): Expr | null {
  const exponentials = factors.filter((factor) => isVaryingExponential(factor, variable)) as PowerNode[];
  if (exponentials.length < 2) return null;
  const exponent = sumOf(...exponentials.map(({ base, exponent: power }) => productOf(power, simplify(func('ln', base)))));
  const rest = factors.filter((factor) => !isVaryingExponential(factor, variable));
  return productOf(...rest, powerOf(E, exponent));
}

/** A term as numerator × denominator⁻¹, splitting off its negative-power factors. */
function splitTerm(term: Expr): { numerator: Expr; denominator: Expr } {
  const factors = term.type === 'mul' ? term.factors : [term];
  return {
    numerator: productOf(...factors.filter((factor) => !isNegativePower(factor))),
    denominator: reciprocalOf(productOf(...factors.filter(isNegativePower))),
  };
}

/** a/b + c/d → (ad + cb)/(bd), so ∞ - ∞ (1/x - 1/sin x) becomes a 0/0 quotient. Null when no term has a denominator. */
function overCommonDenominator(sum: SumNode): Expr | null {
  const parts = sum.terms.map(splitTerm);
  if (parts.every(({ denominator }) => denominator.type === 'num')) return null;
  const numerators = parts.map(({ numerator }, index) =>
    productOf(numerator, ...parts.filter((_, other) => other !== index).map(({ denominator }) => denominator)),
  );
  // Multiplying out lets polynomial parts cancel: (x + 1) - 1 = x.
  return quotientOf(expandAll(sumOf(...numerators)), productOf(...parts.map(({ denominator }) => denominator)));
}

function holdsSquareRoot(expr: Expr, variable: string): boolean {
  if (expr.type === 'pow' && expr.exponent.type === 'num' && expr.exponent.value.denominator === 2n && containsVariable(expr.base, variable)) {
    return true;
  }
  if (expr.type === 'mul') return expr.factors.some((factor) => holdsSquareRoot(factor, variable));
  return false;
}

/** R + S = (R² - S²)/(R - S) for a square-root term R, so √(x² + x) - x becomes x/(√(x² + x) + x). */
function conjugateForm(sum: SumNode, variable: string): Expr | null {
  const root = sum.terms.find((term) => holdsSquareRoot(term, variable));
  if (!root) return null;
  const rest = sumOf(...sum.terms.filter((term) => term !== root));
  const numerator = expandAll(differenceOf(powerOf(root, num(2)), powerOf(rest, num(2))));
  return quotientOf(numerator, differenceOf(root, rest));
}

/** Limit of a sum whose terms couldn't be added up (∞ - ∞, or an unknown term). */
export function resolveSum(sum: SumNode, results: LimitResult[], context: LimitContext, findLimit: FindLimit): LimitResult {
  const dominant = dominantSum(sum.terms, results, context);
  if (dominant) return dominant;
  const next = deeper(context);
  if (!next) return UNKNOWN;
  for (const rewritten of [overCommonDenominator(sum), conjugateForm(sum, context.approach.variable)]) {
    if (!rewritten) continue;
    const result = findLimit(rewritten, next);
    if (result.kind !== 'unknown') return result;
  }
  return UNKNOWN;
}
