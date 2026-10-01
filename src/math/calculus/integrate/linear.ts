import { containsVariable } from '../../ast/inspect';
import { variable as variableNode, type Expr } from '../../ast/nodes';
import { differenceOf, productOf } from '../../operations/arithmetic';
import { derivativeOf } from '../differentiate';

/**
 * Read u as slope·x + intercept with constant slope ≠ 0 (3x - 1, x/2, πx/180).
 * Table integrals like ∫ sin(ax + b) dx = -cos(ax + b)/a only need these two numbers.
 */
export function linearParts(inner: Expr, variable: string): { slope: Expr; intercept: Expr } | null {
  if (!containsVariable(inner, variable)) return null;
  const slope = derivativeOf(inner, variable);
  if (containsVariable(slope, variable)) return null;
  if (slope.type === 'num' && slope.value.isZero()) return null;
  return { slope, intercept: differenceOf(inner, productOf(slope, variableNode(variable))) };
}
