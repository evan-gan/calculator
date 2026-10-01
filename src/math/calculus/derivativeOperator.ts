import { readDerivative } from '../ast/calculus';
import { substituteVariable } from '../ast/inspect';
import type { Expr, FunctionNode } from '../ast/nodes';
import { simplify } from '../simplify/simplify';
import { derivativeOf } from './differentiate';

/** Evaluate d^n/dx^n body, then plug in the point if a value was substituted for x. */
export function simplifyDerivative(call: FunctionNode): Expr {
  const { body, variable, order, point } = readDerivative(call);
  let result = simplify(body);
  for (let step = 0; step < order; step++) result = derivativeOf(result, variable);
  return point ? simplify(substituteVariable(result, variable, simplify(point))) : result;
}
