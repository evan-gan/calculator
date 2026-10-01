import { isConstantExpr, toKey } from '../ast/inspect';
import { num, ONE, type Expr } from '../ast/nodes';
import { Rational } from '../number/rational';
import { simplifySum } from './add';
import { compareFactors, isRadical } from './order';
import { simplifyPower } from './power';
import { collectRadical, normalizeRadicals, type PrimeExponents } from './radicals';

// Combining powers can create new numbers or products (e.g. √x·√x = x, |x|²= x²),
// so we re-run the pass until nothing changes. A handful of passes is always enough.
const MAX_PASSES = 8;

type PassResult = { settled: true; expr: Expr } | { settled: false; factors: Expr[] };

/**
 * Simplify a product whose factors are already simplified: multiply rational coefficients,
 * merge radicals, add exponents of equal bases (x·x² = x³), and distribute constant factors over a sum.
 */
export function simplifyProduct(factors: Expr[]): Expr {
  let current = factors;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const result = combineFactors(current);
    if (result.settled) return result.expr;
    current = result.factors;
  }
  throw new Error(`Product simplification did not settle after ${MAX_PASSES} passes; this is a calculator bug.`);
}

function flatten(factors: Expr[]): Expr[] {
  return factors.flatMap((factor) => (factor.type === 'mul' ? flatten(factor.factors) : [factor]));
}

function combineFactors(factors: Expr[]): PassResult {
  let coefficient = Rational.ONE;
  const primeExponents: PrimeExponents = new Map();
  const groups = new Map<string, { base: Expr; exponents: Expr[]; original: Expr }>();

  for (const factor of flatten(factors)) {
    if (factor.type === 'num') {
      if (factor.value.isZero()) return { settled: true, expr: num(0) };
      coefficient = coefficient.mul(factor.value);
    } else if (factor.type === 'pow' && isRadical(factor) && isPositiveNum(factor.base)) {
      collectRadical(primeExponents, numValue(factor.base), numValue(factor.exponent));
    } else {
      const base = factor.type === 'pow' ? factor.base : factor;
      const exponent = factor.type === 'pow' ? factor.exponent : ONE;
      const key = toKey(base);
      const group = groups.get(key);
      if (group) group.exponents.push(exponent);
      else groups.set(key, { base, exponents: [exponent], original: factor });
    }
  }

  const normalized = normalizeRadicals(primeExponents);
  coefficient = coefficient.mul(normalized.coefficient);

  const others: Expr[] = [];
  let needsAnotherPass = false;
  for (const group of groups.values()) {
    if (group.exponents.length === 1) {
      others.push(group.original);
      continue;
    }
    const combined = simplifyPower(group.base, simplifySum(group.exponents));
    if (combined.type === 'num' || combined.type === 'mul' || isRadical(combined)) needsAnotherPass = true;
    others.push(combined);
  }
  if (needsAnotherPass) return { settled: false, factors: [num(coefficient), ...normalized.radicals, ...others] };

  const sorted = [...normalized.radicals, ...others].sort(compareFactors);
  const distributed = distributeOverSum(coefficient, sorted);
  if (distributed) return { settled: true, expr: distributed };
  return { settled: true, expr: buildProduct(coefficient, sorted) };
}

/**
 * Distribute when every factor except one sum is constant: 2(x+1) = 2x+2 and
 * (1+√2)(1-√2) = -1. Products like x(x+1) are left factored on purpose.
 */
function distributeOverSum(coefficient: Rational, factors: Expr[]): Expr | null {
  const sumIndex = factors.findIndex((factor) => factor.type === 'add');
  if (sumIndex < 0) return null;
  const rest = factors.filter((_, index) => index !== sumIndex);
  if (!rest.every(isConstantExpr)) return null;
  if (coefficient.isOne() && rest.length === 0) return null;
  const sum = factors[sumIndex] as Extract<Expr, { type: 'add' }>;
  const multiplier = [num(coefficient), ...rest];
  return simplifySum(sum.terms.map((term) => simplifyProduct([...multiplier, term])));
}

function buildProduct(coefficient: Rational, sortedFactors: Expr[]): Expr {
  if (sortedFactors.length === 0) return num(coefficient);
  if (coefficient.isOne() && sortedFactors.length === 1) return sortedFactors[0];
  const factors = coefficient.isOne() ? sortedFactors : [num(coefficient), ...sortedFactors];
  return { type: 'mul', factors };
}

function isPositiveNum(expr: Expr): boolean {
  return expr.type === 'num' && !expr.value.isNegative() && !expr.value.isZero();
}

function numValue(expr: Expr): Rational {
  if (expr.type !== 'num') throw new Error('Expected a number node');
  return expr.value;
}
