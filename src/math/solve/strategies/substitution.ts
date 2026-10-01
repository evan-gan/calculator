import { containsVariable, replaceSubtree, toKey } from '../../ast/inspect';
import { mul, pow, variable as variableNode, type Expr } from '../../ast/nodes';
import { simplify } from '../../simplify/simplify';
import { exact, type Solution, type Strategy } from '../types';
import { isolate } from './isolate';

// Substitution: if the unknown only appears inside one repeated piece g(x), solve for
// u = g(x) first. 2sin²x + sin x - 1 = 0 -> 2u² + u - 1 = 0 -> u = 1/2, -1 -> sin x = ...

const SUBSTITUTE_NAME = 'u_{sub}';

/** Rewrite b^(k·t) as (b^t)^k for integer k, so e^(2x) and e^x share the kernel e^x. */
function splitIntegerExponents(expr: Expr): Expr {
  switch (expr.type) {
    case 'add':
      return { type: 'add', terms: expr.terms.map(splitIntegerExponents) };
    case 'mul':
      return { type: 'mul', factors: expr.factors.map(splitIntegerExponents) };
    case 'func':
      return { ...expr, args: expr.args.map(splitIntegerExponents) };
    case 'pow': {
      const { base, exponent } = expr;
      const hasIntegerMultiplier =
        exponent.type === 'mul' && exponent.factors[0].type === 'num' && exponent.factors[0].value.isInteger();
      if (!containsVariable(base) && hasIntegerMultiplier) {
        const [multiplier, ...rest] = exponent.factors;
        const innerExponent = rest.length === 1 ? rest[0] : mul(...rest);
        return pow(pow(base, innerExponent), multiplier);
      }
      return { type: 'pow', base: splitIntegerExponents(base), exponent: splitIntegerExponents(exponent) };
    }
    default:
      return expr;
  }
}

/** The smallest non-polynomial pieces that contain the unknown (sin x, e^x, √x, or x itself). */
function collectKernels(expr: Expr, variable: string, kernels: Map<string, Expr>): void {
  if (!containsVariable(expr, variable)) return;
  if (expr.type === 'add' || expr.type === 'mul') {
    const parts = expr.type === 'add' ? expr.terms : expr.factors;
    parts.forEach((part) => collectKernels(part, variable, kernels));
    return;
  }
  const isIntegerPowerOfVariablePart =
    expr.type === 'pow' &&
    expr.exponent.type === 'num' &&
    expr.exponent.value.isInteger() &&
    !containsVariable(expr.exponent, variable);
  if (isIntegerPowerOfVariablePart) {
    collectKernels(expr.base, variable, kernels);
    return;
  }
  kernels.set(toKey(expr), expr);
}

export const substitutionStrategy: Strategy = (expr, context) => {
  const rewritten = splitIntegerExponents(expr);
  const kernels = new Map<string, Expr>();
  collectKernels(rewritten, context.variable, kernels);
  if (kernels.size !== 1) return null;
  const [[kernelKey, kernel]] = [...kernels.entries()];
  if (kernel.type === 'var') return null;

  const substituted = simplify(replaceSubtree(rewritten, kernelKey, variableNode(SUBSTITUTE_NAME)));
  if (containsVariable(substituted, context.variable)) return null;
  const innerResult = context.solveNested(substituted, SUBSTITUTE_NAME);
  if (innerResult === null || innerResult === 'identity') return null;

  const solutions: Solution[] = [];
  for (const inner of innerResult) {
    if (inner.kind !== 'exact' || inner.period) return null;
    const isolated = isolate(kernel, [exact(inner.value)], context.variable);
    if (!isolated) return null;
    solutions.push(...isolated);
  }
  return solutions;
};
