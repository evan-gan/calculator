import { containsVariable, countOccurrences } from '../../ast/inspect';
import { E, func, num, type Expr, type FunctionNode, type PowerNode } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { differenceOf, powerOf, productOf, quotientOf, reciprocalOf, sumOf } from '../../operations/arithmetic';
import { simplifyFunctionCall } from '../../operations/functions/apply';
import { simplify } from '../../simplify/simplify';
import { getInverseRule } from '../inverses';
import type { ExactSolution } from '../inverses/types';
import { solvePurePower } from '../polynomial/pureRoots';
import { exact, type Strategy } from '../types';

// Isolation: when the unknown appears exactly once, walk from the top of the tree
// down to it, undoing each operation on the other side.  3√(2x-1) + 4 = 10
//   -> 3√(2x-1) = 6 -> √(2x-1) = 2 -> 2x - 1 = 4 -> x = 5/2

type Branches = ExactSolution[];

export const isolationStrategy: Strategy = (expr, context) => {
  if (countOccurrences(expr, context.variable) !== 1) return null;
  return isolate(expr, [exact(num(0))], context.variable);
};

/** Solve expr = branch for the variable. Returns null if some step can't be undone. */
export function isolate(expr: Expr, branches: Branches, variable: string): Branches | null {
  if (branches.length === 0) return [];
  switch (expr.type) {
    case 'var':
      return expr.name === variable ? branches : null;
    case 'add':
      return isolateSum(expr.terms, branches, variable);
    case 'mul':
      return isolateProduct(expr.factors, branches, variable);
    case 'pow':
      return isolatePower(expr, branches, variable);
    case 'func':
      return isolateFunction(expr, branches, variable);
    default:
      return null;
  }
}

function splitByVariable(parts: Expr[], variable: string): { inner: Expr; others: Expr[] } | null {
  const inner = parts.filter((part) => containsVariable(part, variable));
  if (inner.length !== 1) return null;
  return { inner: inner[0], others: parts.filter((part) => !containsVariable(part, variable)) };
}

function isolateSum(terms: Expr[], branches: Branches, variable: string): Branches | null {
  const split = splitByVariable(terms, variable);
  if (!split) return null;
  const rest = sumOf(...split.others);
  return isolate(split.inner, branches.map((branch) => ({ ...branch, value: differenceOf(branch.value, rest) })), variable);
}

function isolateProduct(factors: Expr[], branches: Branches, variable: string): Branches | null {
  const split = splitByVariable(factors, variable);
  if (!split) return null;
  const multiplier = productOf(...split.others);
  // Dividing a periodic family by c scales its period by 1/|c|: 2x = π/6 + 2πn -> x = π/12 + πn
  const multiplierSize = simplifyFunctionCall('abs', [multiplier]);
  const divided = branches.map((branch) =>
    exact(quotientOf(branch.value, multiplier), branch.period && quotientOf(branch.period, multiplierSize)),
  );
  return isolate(split.inner, divided, variable);
}

const isPeriodic = (branches: Branches) => branches.some((branch) => branch.period);

function isolatePower(power: PowerNode, branches: Branches, variable: string): Branches | null {
  // Non-linear steps can't carry a "+ period·n" family through, so give up on those.
  if (isPeriodic(branches)) return null;
  const baseHasVariable = containsVariable(power.base, variable);
  const exponentHasVariable = containsVariable(power.exponent, variable);
  if (baseHasVariable && !exponentHasVariable) {
    const next = branches.flatMap((branch) => invertPower(power.exponent, branch.value).map((value) => exact(value)));
    return isolate(power.base, next, variable);
  }
  if (!baseHasVariable && exponentHasVariable) {
    const next = branches.flatMap((branch) => invertExponential(power.base, branch.value).map((value) => exact(value)));
    return isolate(power.exponent, next, variable);
  }
  return null;
}

/** u^(p/q) = r. Solve y^p = r for y = u^(1/q), then u = y^q (even q needs y >= 0). */
function invertPower(exponent: Expr, value: Expr): Expr[] {
  if (exponent.type !== 'num') {
    return numericSign(value) === 1 ? [powerOf(value, reciprocalOf(exponent))] : [];
  }
  let { numerator, denominator } = exponent.value;
  let target = value;
  if (numerator < 0n) {
    if (numericSign(value) === 0) return [];
    target = reciprocalOf(value);
    numerator = -numerator;
  }
  return solvePurePower(numerator, target).flatMap((root) => {
    const rootSign = numericSign(root);
    if (denominator % 2n === 0n && (rootSign === null || rootSign < 0)) return [];
    return [powerOf(root, num(denominator))];
  });
}

/** b^u = r -> u = log_b(r), which needs r > 0 and a positive base b != 1. */
function invertExponential(base: Expr, value: Expr): Expr[] {
  if (numericSign(value) !== 1 || numericSign(base) !== 1) return [];
  if (base.type === 'const' && base.name === E.name) return [simplifyFunctionCall('ln', [value])];
  return [simplify(func('log', value, base))];
}

function isolateFunction(call: FunctionNode, branches: Branches, variable: string): Branches | null {
  const rule = getInverseRule(call.name);
  if (!rule || isPeriodic(branches)) return null;
  if (call.args.slice(1).some((arg) => containsVariable(arg, variable))) return null;
  const next = branches.flatMap((branch) => rule(branch.value, call.args));
  return isolate(call.args[0], next, variable);
}
