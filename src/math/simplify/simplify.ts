import { isCalculusOperator } from '../ast/calculus';
import type { Expr } from '../ast/nodes';
import { simplifyCalculus } from '../calculus/simplifyCalculus';
import { simplifySum } from '../operations/add';
import { simplifyFunctionCall } from '../operations/functions/apply';
import { simplifyProduct } from '../operations/multiply';
import { simplifyPower } from '../operations/power';

/**
 * Bring an expression into canonical exact form, bottom-up.
 * Each node type hands off to its operation file in ../operations, which is where
 * the actual rules live (add.ts, multiply.ts, power.ts, functions/*).
 */
export function simplify(expr: Expr): Expr {
  switch (expr.type) {
    case 'num':
    case 'const':
    case 'var':
      return expr;
    case 'add':
      return simplifySum(expr.terms.map(simplify));
    case 'mul':
      return simplifyProduct(expr.factors.map(simplify));
    case 'pow':
      return simplifyPower(simplify(expr.base), simplify(expr.exponent));
    case 'func':
      // Calculus operators simplify their own arguments: their bodies need the variable kept symbolic.
      if (isCalculusOperator(expr.name)) return simplifyCalculus(expr);
      return simplifyFunctionCall(expr.name, expr.args.map(simplify));
  }
}
