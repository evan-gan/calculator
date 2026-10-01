import { toKey } from '../ast/inspect';
import { num, type Expr } from '../ast/nodes';
import { Rational } from '../number/rational';
import { compareTerms } from './order';

/** Split a simplified term into its rational coefficient and the remaining factors (3√2x -> 3, [√2, x]). */
export function splitCoefficient(term: Expr): { coefficient: Rational; rest: Expr[] } {
  if (term.type === 'num') return { coefficient: term.value, rest: [] };
  if (term.type === 'mul') {
    const [first, ...others] = term.factors;
    return first.type === 'num' ? { coefficient: first.value, rest: others } : { coefficient: Rational.ONE, rest: term.factors };
  }
  return { coefficient: Rational.ONE, rest: [term] };
}

function buildTerm(coefficient: Rational, rest: Expr[]): Expr {
  if (coefficient.isOne() && rest.length === 1) return rest[0];
  const factors = coefficient.isOne() ? rest : [num(coefficient), ...rest];
  return factors.length === 1 ? factors[0] : { type: 'mul', factors };
}

/**
 * Simplify a sum whose terms are already simplified: flatten nested sums, add the
 * rational constants, and combine like terms (2√2 + 3√2 = 5√2, x + x = 2x).
 */
export function simplifySum(terms: Expr[]): Expr {
  let constantPart = Rational.ZERO;
  const groups = new Map<string, { coefficient: Rational; rest: Expr[] }>();

  const addTerm = (term: Expr) => {
    if (term.type === 'add') {
      term.terms.forEach(addTerm);
      return;
    }
    const { coefficient, rest } = splitCoefficient(term);
    if (rest.length === 0) {
      constantPart = constantPart.add(coefficient);
      return;
    }
    const key = rest.map(toKey).join('*');
    const existing = groups.get(key);
    groups.set(key, { coefficient: (existing?.coefficient ?? Rational.ZERO).add(coefficient), rest });
  };
  terms.forEach(addTerm);

  const combined: Expr[] = [];
  for (const { coefficient, rest } of groups.values()) {
    if (!coefficient.isZero()) combined.push(buildTerm(coefficient, rest));
  }
  if (!constantPart.isZero()) combined.push(num(constantPart));

  if (combined.length === 0) return num(0);
  if (combined.length === 1) return combined[0];
  return { type: 'add', terms: combined.sort(compareTerms) };
}
