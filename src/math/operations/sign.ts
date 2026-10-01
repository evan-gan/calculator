import { isConstantExpr } from '../ast/inspect';
import type { Expr } from '../ast/nodes';
import { numericSign } from '../evaluate/evaluate';

/** True when a simplified expression is written with a leading minus (-3, -2x). */
export function hasNegativeSign(expr: Expr): boolean {
  if (expr.type === 'num') return expr.value.isNegative();
  return expr.type === 'mul' && expr.factors[0].type === 'num' && expr.factors[0].value.isNegative();
}

/**
 * True for variable-free expressions with a positive value (π, √2, 3 - √2).
 * Uses a float evaluation; exact constants are never close enough to zero for that to mislead.
 */
export function isPositiveConstant(expr: Expr): boolean {
  return isConstantExpr(expr) && numericSign(expr) === 1;
}

export function isNegativeConstant(expr: Expr): boolean {
  return isConstantExpr(expr) && numericSign(expr) === -1;
}
