import type { Expr, FunctionNode } from '../ast/nodes';
import { simplifyDerivative } from './derivativeOperator';
import { simplifyIntegral } from './integralOperator';
import { simplifySeries } from './series/seriesOperator';

/** Evaluate a calculus operator node exactly where possible (called by simplify). */
export function simplifyCalculus(call: FunctionNode): Expr {
  switch (call.name) {
    case 'derivative':
      return simplifyDerivative(call);
    case 'integral':
      return simplifyIntegral(call);
    default:
      return simplifySeries(call);
  }
}
