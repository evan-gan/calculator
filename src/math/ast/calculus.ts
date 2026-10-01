import {
  constant,
  func,
  num,
  variable,
  type CalculusOperatorName,
  type Expr,
  type FunctionName,
  type FunctionNode,
} from './nodes';

// Calculus operators are function calls with a fixed argument layout. The second argument
// is always the operator's variable as a var node, so generic tree code (angle mode,
// toKey, replaceSubtree) handles them without special cases.
//
//   derivative: [body, variable, order]          d^n/dx^n body
//               [body, variable, order, point]   ... evaluated at variable = point
//   integral:   [body, variable]                 indefinite ∫ body dx
//               [body, variable, lower, upper]   definite
//   sum/product:[body, variable, lower, upper]   Σ/Π for variable = lower..upper

export type SeriesName = 'sum' | 'product';

export interface DerivativeParts {
  body: Expr;
  variable: string;
  order: number;
  /** Where the derivative is evaluated, once a value is substituted for its variable. */
  point: Expr | null;
}

export interface IntegralParts {
  body: Expr;
  variable: string;
  /** Null for an indefinite integral. */
  bounds: { lower: Expr; upper: Expr } | null;
}

export interface SeriesParts {
  body: Expr;
  variable: string;
  lower: Expr;
  upper: Expr;
}

const CALCULUS_OPERATORS = new Set<FunctionName>(['derivative', 'integral', 'sum', 'product']);

export function isCalculusOperator(name: FunctionName): name is CalculusOperatorName {
  return CALCULUS_OPERATORS.has(name);
}

export const INFINITY = constant('infinity');

export function derivative(body: Expr, variableName: string, order = 1, point: Expr | null = null): FunctionNode {
  const args = [body, variable(variableName), num(order)];
  return func('derivative', ...(point ? [...args, point] : args));
}

export function integral(body: Expr, variableName: string, bounds: IntegralParts['bounds'] = null): FunctionNode {
  if (!bounds) return func('integral', body, variable(variableName));
  return func('integral', body, variable(variableName), bounds.lower, bounds.upper);
}

export function series(name: SeriesName, body: Expr, variableName: string, lower: Expr, upper: Expr): FunctionNode {
  return func(name, body, variable(variableName), lower, upper);
}

function variableNameOf(call: FunctionNode): string {
  const marker = call.args[1];
  if (marker?.type !== 'var') throw new Error(`${call.name} node is missing its variable argument`);
  return marker.name;
}

export function readDerivative(call: FunctionNode): DerivativeParts {
  const order = call.args[2];
  if (order?.type !== 'num') throw new Error('derivative node is missing its order');
  return { body: call.args[0], variable: variableNameOf(call), order: order.value.toNumber(), point: call.args[3] ?? null };
}

export function readIntegral(call: FunctionNode): IntegralParts {
  const [body, , lower, upper] = call.args;
  return { body, variable: variableNameOf(call), bounds: lower && upper ? { lower, upper } : null };
}

export function readSeries(call: FunctionNode): SeriesParts {
  const [body, , lower, upper] = call.args;
  return { body, variable: variableNameOf(call), lower, upper };
}

/**
 * Variable that is local to the operator's body, or null when the body's variable stays free.
 * Σ_{n=1}^{5} n and ∫_0^1 x dx don't depend on n or x, but d/dx x² and ∫ x dx do depend on x
 * (until a point is substituted into the derivative).
 */
export function boundVariableOf(call: FunctionNode): string | null {
  if (!isCalculusOperator(call.name)) return null;
  switch (call.name) {
    case 'sum':
    case 'product':
      return variableNameOf(call);
    case 'integral':
      return call.args.length === 4 ? variableNameOf(call) : null;
    case 'derivative':
      return call.args.length === 4 ? variableNameOf(call) : null;
  }
}

/** +1 for ∞, -1 for -∞, 0 for anything else. */
export function infinityDirection(expr: Expr): -1 | 0 | 1 {
  if (expr.type === 'const' && expr.name === 'infinity') return 1;
  if (expr.type === 'mul' && expr.factors.length === 2) {
    const [sign, magnitude] = expr.factors;
    if (sign.type === 'num' && sign.value.isNegative() && magnitude.type === 'const' && magnitude.name === 'infinity') return -1;
  }
  return 0;
}

/** True if any derivative, integral, sum or product node is left in the expression. */
export function containsCalculusOperator(expr: Expr): boolean {
  switch (expr.type) {
    case 'add':
      return expr.terms.some(containsCalculusOperator);
    case 'mul':
      return expr.factors.some(containsCalculusOperator);
    case 'pow':
      return containsCalculusOperator(expr.base) || containsCalculusOperator(expr.exponent);
    case 'func':
      return isCalculusOperator(expr.name) || expr.args.some(containsCalculusOperator);
    default:
      return false;
  }
}

/** True when the result is only known up to a constant (+C). Differentiating removes the constant again. */
export function containsIndefiniteIntegral(expr: Expr): boolean {
  if (expr.type === 'func' && expr.name === 'integral' && expr.args.length === 2) return true;
  if (expr.type === 'func' && expr.name === 'derivative') return false;
  switch (expr.type) {
    case 'add':
      return expr.terms.some(containsIndefiniteIntegral);
    case 'mul':
      return expr.factors.some(containsIndefiniteIntegral);
    case 'pow':
      return containsIndefiniteIntegral(expr.base) || containsIndefiniteIntegral(expr.exponent);
    case 'func':
      return expr.args.some(containsIndefiniteIntegral);
    default:
      return false;
  }
}
