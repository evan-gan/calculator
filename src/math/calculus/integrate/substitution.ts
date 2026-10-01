import { collectVariables, containsVariable, replaceSubtree, substituteVariable, toKey } from '../../ast/inspect';
import { variable as variableNode, type Expr } from '../../ast/nodes';
import { quotientOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { derivativeOf } from '../differentiate';
import { linearParts } from './linear';
import type { IntegrationMethod } from './types';

// u-substitution: find an inner expression g with f = h(g)·g', integrate h(u), put g back.
// ∫ 2x·cos(x²) dx: g = x², f/g' = cos(x²) = cos(u)  ->  sin(u)  ->  sin(x²).

// Trying every subexpression gets slow for large integrands; the biggest ones are tried first.
const MAX_CANDIDATES = 12;

/** Inner expressions worth trying as g: function calls and their arguments, powers and their parts. */
function collectCandidates(expr: Expr, variable: string, found: Map<string, Expr>): void {
  const consider = (candidate: Expr) => {
    if (candidate.type !== 'var' && containsVariable(candidate, variable) && !linearParts(candidate, variable)) {
      found.set(toKey(candidate), candidate);
    }
  };
  switch (expr.type) {
    case 'add':
    case 'mul':
      (expr.type === 'add' ? expr.terms : expr.factors).forEach((child) => collectCandidates(child, variable, found));
      if (expr.type === 'add') consider(expr);
      break;
    case 'pow':
      consider(expr);
      consider(expr.base);
      consider(expr.exponent);
      collectCandidates(expr.base, variable, found);
      collectCandidates(expr.exponent, variable, found);
      break;
    case 'func':
      consider(expr);
      expr.args.forEach((arg) => {
        consider(arg);
        collectCandidates(arg, variable, found);
      });
      break;
  }
}

/** A name that doesn't clash with anything in the integrand. */
function freshVariable(expr: Expr): string {
  const taken = new Set(collectVariables(expr));
  let index = 0;
  while (taken.has(`u_{${index}}`)) index++;
  return `u_{${index}}`;
}

export const substitutionMethod: IntegrationMethod = (expr, variable, integrate) => {
  const found = new Map<string, Expr>();
  collectCandidates(expr, variable, found);
  const candidates = [...found.values()].sort((first, second) => toKey(second).length - toKey(first).length).slice(0, MAX_CANDIDATES);
  const substitute = freshVariable(expr);
  for (const inner of candidates) {
    const rate = derivativeOf(inner, variable);
    if (rate.type === 'num' && rate.value.isZero()) continue;
    const inTermsOfInner = simplify(replaceSubtree(quotientOf(expr, rate), toKey(inner), variableNode(substitute)));
    if (containsVariable(inTermsOfInner, variable)) continue;
    const antiderivative = integrate(inTermsOfInner, substitute);
    if (antiderivative) return substituteVariable(antiderivative, substitute, inner);
  }
  return null;
};
