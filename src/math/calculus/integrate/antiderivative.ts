import { collectVariables, containsVariable, toKey } from '../../ast/inspect';
import { variable as variableNode, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate, type VariableValues } from '../../evaluate/evaluate';
import { expandAll, termsOf } from '../../operations/expand';
import { productOf, sumOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { derivativeOf } from '../differentiate';
import { partsMethod } from './byParts';
import { rationalFunctionMethod } from './rationalFunction';
import { substitutionMethod } from './substitution';
import { tableMethod } from './table';
import type { Integrate, IntegrationMethod } from './types';

// Entry point for finding antiderivatives. Constants and sums are split off first, then each
// method is tried in order. Every answer is checked by differentiating it back.

/** Multiply out (x+1)² or x(sin x + 1) and integrate term by term. */
const expansionMethod: IntegrationMethod = (expr, _variable, integrate) => {
  const expanded = expandAll(expr);
  return toKey(expanded) !== toKey(expr) && expanded.type === 'add' ? integrate(expanded) : null;
};

const METHODS: IntegrationMethod[] = [tableMethod, rationalFunctionMethod, substitutionMethod, partsMethod, expansionMethod];

// Substitution and parts call back into the engine; this bounds how deep that can go.
const MAX_DEPTH = 8;

function splitConstantFactors(expr: Expr, variable: string): { constant: Expr; rest: Expr } {
  const factors = expr.type === 'mul' ? expr.factors : [expr];
  return {
    constant: productOf(...factors.filter((factor) => !containsVariable(factor, variable))),
    rest: productOf(...factors.filter((factor) => containsVariable(factor, variable))),
  };
}

function integrateTerms(terms: Expr[], variable: string, depth: number): Expr | null {
  const pieces: Expr[] = [];
  for (const term of terms) {
    const piece = integrateAt(term, variable, depth);
    if (!piece) return null;
    pieces.push(piece);
  }
  return sumOf(...pieces);
}

function integrateAt(expr: Expr, variable: string, depth: number): Expr | null {
  if (depth > MAX_DEPTH) return null;
  if (!containsVariable(expr, variable)) return productOf(expr, variableNode(variable));
  if (expr.type === 'add') {
    const termwise = integrateTerms(termsOf(expr), variable, depth);
    if (termwise) return termwise;
  }
  const { constant, rest } = splitConstantFactors(expr, variable);
  if (!(constant.type === 'num' && constant.value.isOne())) {
    const inner = integrateAt(rest, variable, depth);
    return inner && productOf(constant, inner);
  }
  const integrate = (next: Expr, nextVariable = variable) => integrateAt(simplify(next), nextVariable, depth + 1);
  for (const method of METHODS) {
    const result = tryMethod(method, expr, variable, integrate);
    if (result) return result;
  }
  return null;
}

function tryMethod(method: IntegrationMethod, expr: Expr, variable: string, integrate: Integrate): Expr | null {
  try {
    const result = method(expr, variable, integrate);
    return result && simplify(result);
  } catch (error) {
    // A domain error inside a method (like ln of a negative constant) means the method doesn't apply here.
    if (error instanceof MathError) return null;
    throw error;
  }
}

// Points for checking F' = f. A mix of signs and sizes so functions defined only on part of
// the line (arcsin, ln, √) still get several defined samples.
const CHECK_POINTS = [-7.31, -2.17, -0.83, -0.43, 0.27, 0.618, 1.414, 3.3, 9.87];

function sampleValues(variable: string, x: number, others: string[]): VariableValues {
  const values: VariableValues = { [variable]: x };
  others.forEach((name, index) => (values[name] = 1.23 + 0.37 * index));
  return values;
}

/** Numerically confirm that F' = f wherever both are defined. */
function isAntiderivative(antiderivative: Expr, integrand: Expr, variable: string): boolean {
  const rate = derivativeOf(antiderivative, variable);
  const others = collectVariables(integrand).filter((name) => name !== variable);
  let agreeing = 0;
  for (const x of CHECK_POINTS) {
    const values = sampleValues(variable, x, others);
    const expected = evaluate(integrand, values);
    const actual = evaluate(rate, values);
    if (!Number.isFinite(expected) || !Number.isFinite(actual)) continue;
    if (Math.abs(expected - actual) > 1e-7 * Math.max(1, Math.abs(expected))) return false;
    agreeing++;
  }
  return agreeing >= 2;
}

/** An antiderivative of a simplified integrand (without the + C), or null if none was found. */
export function findAntiderivative(integrand: Expr, variable: string): Expr | null {
  const result = integrateAt(integrand, variable, 0);
  return result && isAntiderivative(result, integrand, variable) ? result : null;
}
