import { containsVariable } from '../../ast/inspect';
import { mul, num, type Expr } from '../../ast/nodes';
import { limitFromGrowth } from './growth';
import { signNear } from './probe';
import { finite, infinite, type LimitContext, type LimitResult } from './types';

// The growth hierarchy at ±∞: factorials beat exponentials, which beat powers, which beat
// logarithms. In x¹⁰⁰·e^(-x) the exponential wins, so the product goes to 0, with no need for
// a hundred rounds of L'Hôpital; in x - ln x the power wins, so the difference goes to ∞.

const enum GrowthClass {
  Logarithm = 1,
  Power = 2,
  Exponential = 3,
  Factorial = 4,
}

/** True when an algebraic argument runs off to ∞ or shrinks to 0 (so ln of it grows without bound). */
function runsAway(argument: Expr, variable: string, direction: 1 | -1, allowShrinking: boolean): boolean {
  const result = limitFromGrowth(argument, variable, direction);
  if (result?.kind === 'infinite') return result.sign === 1;
  return allowShrinking && result?.kind === 'finite' && result.value.type === 'num' && result.value.value.isZero();
}

/**
 * Which family a factor that tends to 0 or ±∞ belongs to, or null when it isn't one of them.
 * ln(1 + 1/x) is not a logarithm-type factor: its argument tends to 1, so it shrinks like 1/x.
 */
function classify(expr: Expr, variable: string, direction: 1 | -1): GrowthClass | null {
  if (expr.type === 'func' && expr.name === 'factorial') {
    return runsAway(expr.args[0], variable, direction, false) ? GrowthClass.Factorial : null;
  }
  if (expr.type === 'func' && (expr.name === 'ln' || expr.name === 'log')) {
    return runsAway(expr.args[0], variable, direction, true) ? GrowthClass.Logarithm : null;
  }
  if (expr.type === 'pow' && !containsVariable(expr.exponent, variable)) {
    // (ln x)², √(x!), 1/eˣ keep the family of their base.
    if (expr.base.type === 'func' || (expr.base.type === 'pow' && containsVariable(expr.base.exponent, variable))) {
      return classify(expr.base, variable, direction);
    }
  }
  if (expr.type === 'pow' && !containsVariable(expr.base, variable)) {
    const exponentLimit = limitFromGrowth(expr.exponent, variable, direction);
    return exponentLimit?.kind === 'infinite' ? GrowthClass.Exponential : null;
  }
  return limitFromGrowth(expr, variable, direction) ? GrowthClass.Power : null;
}

/**
 * 0·∞ at ±∞ decided by the strongest family: if all the strongest factors go to 0 the product
 * does, if they all go to ∞ it does too (with the sign seen next to the point). Null otherwise.
 */
export function dominantProduct(factors: Expr[], results: LimitResult[], context: LimitContext): LimitResult | null {
  const { approach } = context;
  if (approach.point) return null;
  let strongest = 0;
  const classes: (GrowthClass | null)[] = [];
  for (const [index, factor] of factors.entries()) {
    const result = results[index];
    const isVanishing = result.kind === 'finite' && result.value.type === 'num' && result.value.value.isZero();
    if (result.kind !== 'infinite' && !isVanishing) {
      classes.push(null);
      continue;
    }
    const growthClass = classify(factor, approach.variable, approach.direction);
    if (growthClass === null) return null;
    classes.push(growthClass);
    strongest = Math.max(strongest, growthClass);
  }
  const strongestKinds = new Set(results.filter((_, index) => classes[index] === strongest).map(({ kind }) => kind));
  // A tie inside the strongest family (x²·x⁻³) needs the finer rules.
  if (strongestKinds.size !== 1) return null;
  if (strongestKinds.has('finite')) return finite(num(0));
  const sign = signNear(mul(...factors), context);
  return sign === null ? null : infinite(sign);
}

/** ∞ - ∞ at ±∞ decided by the strongest family, when all its terms have the same sign. Null otherwise. */
export function dominantSum(terms: Expr[], results: LimitResult[], context: LimitContext): LimitResult | null {
  const { approach } = context;
  if (approach.point) return null;
  let strongest = 0;
  const signsByClass = new Map<number, Set<number>>();
  for (const [index, term] of terms.entries()) {
    const result = results[index];
    if (result.kind !== 'infinite') continue;
    const factors = term.type === 'mul' ? term.factors : [term];
    const growthClass = Math.max(...factors.map((factor) => (containsVariable(factor, approach.variable) ? (classify(factor, approach.variable, approach.direction) ?? 0) : 0)));
    if (growthClass === 0) return null;
    strongest = Math.max(strongest, growthClass);
    signsByClass.set(growthClass, new Set([...(signsByClass.get(growthClass) ?? []), result.sign]));
  }
  const signs = signsByClass.get(strongest);
  return signs && signs.size === 1 ? infinite([...signs][0] as 1 | -1) : null;
}
