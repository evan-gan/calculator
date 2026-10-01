import { infinityDirection, readSeries, series, type SeriesName } from '../../ast/calculus';
import { collectVariables, containsVariable } from '../../ast/inspect';
import { func, num, type Expr, type FunctionNode } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate } from '../../evaluate/evaluate';
import { differenceOf, powerOf, productOf, quotientOf, sumOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { closedFormSum, termAt } from './finiteSums';
import { exactInfiniteSum } from './infiniteSums';
import { numericInfiniteSum } from './numericSeries';

// Σ and Π. Closed forms are tried first; short finite ones are added up exactly term by term;
// anything else stays unevaluated and displays as a numeric approximation.

// Each exact term is simplified on its own, so long sums get slow; beyond this they go numeric.
const MAX_EXACT_TERMS = 500;
// Short sums with other variables read better written out (x + x² + x³) than as a formula.
const MAX_WRITTEN_OUT_TERMS = 20;

function integerLimit(limit: Expr): bigint | null {
  return limit.type === 'num' && limit.value.isInteger() ? limit.value.numerator : null;
}

function assertValidLimits(symbol: string, lower: Expr, upper: Expr): void {
  if (infinityDirection(lower) !== 0) throw new MathError(`${symbol} has to start at a number, not ∞.`);
  if (infinityDirection(upper) === -1) throw new MathError(`${symbol} can't run up to -∞.`);
  for (const limit of [lower, upper]) {
    if (limit.type === 'num' && !limit.value.isInteger()) throw new MathError(`The limits of ${symbol} must be whole numbers.`);
  }
}

/** Every term from lower to upper, exactly; null when there are too many. */
function expandTerms(term: Expr, index: string, lower: bigint, upper: bigint): Expr[] | null {
  if (upper - lower + 1n > BigInt(MAX_EXACT_TERMS)) return null;
  const terms: Expr[] = [];
  for (let n = lower; n <= upper; n++) terms.push(termAt(term, index, num(n)));
  return terms;
}

function closedFormOrNull(term: Expr, index: string, lower: Expr, upper: Expr): Expr | null {
  try {
    return closedFormSum(term, index, lower, upper);
  } catch (error) {
    // e.g. a geometric formula dividing by zero: just add the terms up instead.
    if (error instanceof MathError) return null;
    throw error;
  }
}

function simplifyInfiniteSum(term: Expr, index: string, lower: Expr, unevaluated: Expr): Expr {
  const start = integerLimit(lower);
  if (start === null) return unevaluated;
  const exact = exactInfiniteSum(term, index, start);
  if (exact) return exact;
  if (collectVariables(term).some((name) => name !== index)) return unevaluated;
  const approximate = numericInfiniteSum((n) => evaluate(term, { [index]: n }), Number(start));
  if (approximate === null) throw new MathError("Couldn't find a value for this series: it diverges, or converges too slowly to compute.");
  return unevaluated;
}

function simplifySum(term: Expr, index: string, lower: Expr, upper: Expr): Expr {
  const unevaluated = series('sum', term, index, lower, upper);
  if (infinityDirection(upper) === 1) return simplifyInfiniteSum(term, index, lower, unevaluated);
  const [start, end] = [integerLimit(lower), integerLimit(upper)];
  if (start !== null && end !== null && end < start) return num(0);
  const hasOtherVariables = collectVariables(term).some((name) => name !== index);
  if (start !== null && end !== null && hasOtherVariables && end - start < BigInt(MAX_WRITTEN_OUT_TERMS)) {
    return sumOf(...(expandTerms(term, index, start, end) ?? []));
  }
  const closedForm = closedFormOrNull(term, index, lower, upper);
  if (closedForm) return closedForm;
  const terms = start !== null && end !== null ? expandTerms(term, index, start, end) : null;
  return terms ? sumOf(...terms) : unevaluated;
}

function simplifyProduct(term: Expr, index: string, lower: Expr, upper: Expr): Expr {
  if (infinityDirection(upper) === 1) throw new MathError("Infinite products (Π up to ∞) aren't supported yet.");
  const [start, end] = [integerLimit(lower), integerLimit(upper)];
  if (start !== null && end !== null && end < start) return num(1);
  const count = sumOf(differenceOf(upper, lower), num(1));
  if (!containsVariable(term, index)) return powerOf(term, count);
  // Π_{n=a}^{b} n = b!/(a-1)!
  if (term.type === 'var' && start !== null && start >= 1n) {
    return quotientOf(simplify(func('factorial', upper)), simplify(func('factorial', num(start - 1n))));
  }
  const terms = start !== null && end !== null ? expandTerms(term, index, start, end) : null;
  return terms ? productOf(...terms) : series('product', term, index, lower, upper);
}

/** Simplify a Σ or Π node. */
export function simplifySeries(call: FunctionNode): Expr {
  const { body, variable: index, lower, upper } = readSeries(call);
  const term = simplify(body);
  const [low, high] = [simplify(lower), simplify(upper)];
  const name = call.name as SeriesName;
  assertValidLimits(name === 'sum' ? 'Σ' : 'Π', low, high);
  return name === 'sum' ? simplifySum(term, index, low, high) : simplifyProduct(term, index, low, high);
}

// Numeric evaluation of unevaluated Σ/Π nodes adds at most this many terms.
const MAX_NUMERIC_TERMS = 1_000_000;

/** Float value of a Σ or Π node, NaN when it can't be computed. */
export function evaluateSeries(call: FunctionNode, values: Record<string, number>): number {
  const { body, variable: index, lower, upper } = readSeries(call);
  const start = evaluate(lower, values);
  const end = evaluate(upper, values);
  const termAtIndex = (n: number) => evaluate(body, { ...values, [index]: n });
  if (call.name === 'sum' && end === Infinity) return numericInfiniteSum(termAtIndex, start) ?? NaN;
  if (!Number.isInteger(start) || !Number.isInteger(end) || end - start > MAX_NUMERIC_TERMS) return NaN;
  let result = call.name === 'sum' ? 0 : 1;
  for (let n = start; n <= end; n++) result = call.name === 'sum' ? result + termAtIndex(n) : result * termAtIndex(n);
  return result;
}
