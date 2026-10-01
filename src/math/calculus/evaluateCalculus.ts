import { readIntegral } from '../ast/calculus';
import { collectVariables } from '../ast/inspect';
import type { FunctionNode } from '../ast/nodes';
import { MathError } from '../errors';
import { evaluate, type VariableValues } from '../evaluate/evaluate';
import { simplify } from '../simplify/simplify';
import { numericIntegral } from './numericIntegral';
import { evaluateSeries } from './series/seriesOperator';
import { findSingularPoints } from './singularPoints';

// Float values of calculus nodes, for decimal display and numeric checks.

function evaluateDefiniteIntegral(call: FunctionNode, values: VariableValues): number {
  const { body, variable, bounds } = readIntegral(call);
  if (!bounds) return NaN;
  const start = evaluate(bounds.lower, values);
  const end = evaluate(bounds.upper, values);
  if (Number.isNaN(start) || Number.isNaN(end)) return NaN;
  // Singular points can only be located exactly when nothing else in the integrand is unknown.
  const hasOtherVariables = collectVariables(body).some((name) => name !== variable);
  const breakpoints = hasOtherVariables ? [] : findSingularPoints(body, variable, start, end);
  return numericIntegral((x) => evaluate(body, { ...values, [variable]: x }), start, end, breakpoints) ?? NaN;
}

/** Float value of a derivative, integral, sum or product node; NaN when it has none. */
export function evaluateCalculus(call: FunctionNode, values: VariableValues): number {
  if (call.name === 'sum' || call.name === 'product') return evaluateSeries(call, values);
  if (call.name === 'integral' && call.args.length === 4) return evaluateDefiniteIntegral(call, values);
  // Derivatives and indefinite integrals: evaluate the exact result.
  try {
    return evaluate(simplify(call), values);
  } catch (error) {
    if (error instanceof MathError) return NaN;
    throw error;
  }
}
