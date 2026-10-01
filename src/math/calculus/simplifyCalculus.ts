import type { Expr, FunctionNode } from '../ast/nodes';
import { simplifyDerivative } from './derivativeOperator';
import { simplifyIntegral } from './integralOperator';
import { simplifyLimit } from './limit/limitOperator';
import { simplifySeries } from './series/seriesOperator';

/** Evaluate a calculus operator node exactly where possible (called by simplify). */
export function simplifyCalculus(call: FunctionNode): Expr {
  switch (call.name) {
    case 'derivative':
      return simplifyDerivative(call);
    case 'integral':
      return simplifyIntegral(call);
    case 'limit':
      return simplifyLimit(call);
    default:
      return simplifySeries(call);
  }
}
