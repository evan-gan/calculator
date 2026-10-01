import { divide, func, mul, negate, num, pow, type Expr, type FunctionName } from '../../ast/nodes';
import { MathError } from '../../errors';
import type { Rational } from '../../number/rational';
import { negated } from '../arithmetic';
import { hasNegativeSign } from '../sign';
import { simplify } from '../../simplify/simplify';
import { exactCosine, exactSine, piMultiple, reduceTrigCall } from './trigTable';
import type { FunctionDefinition } from './types';

// sin, cos, tan and their reciprocals. Exact values come from the table in trigTable.ts;
// otherwise the only rewrite is pulling a minus sign out using odd/even symmetry.

type AngleValue = (multipleOfPi: Rational) => Expr | null;
type Ratio = { numerator: AngleValue; denominator: AngleValue };

function isZeroExpr(expr: Expr): boolean {
  const simplified = simplify(expr);
  return simplified.type === 'num' && simplified.value.isZero();
}

/** Exact value of numerator(rπ) / denominator(rπ), throwing when the denominator is zero. */
function exactRatio(name: FunctionName, argument: Expr, ratio: Ratio): Expr | null {
  const multiple = piMultiple(argument);
  if (!multiple) return null;
  const top = ratio.numerator(multiple);
  const bottom = ratio.denominator(multiple);
  if (!top || !bottom) return null;
  if (isZeroExpr(bottom)) throw new MathError(`${name} is undefined at that angle (it would divide by zero).`);
  return divide(top, bottom);
}

/** sin(-x) = -sin(x) style rewrite for odd functions; even functions just drop the sign. */
function applySymmetry(name: FunctionName, argument: Expr, isOdd: boolean): Expr | null {
  if (!hasNegativeSign(argument)) return null;
  const mirrored = func(name, negated(argument));
  return isOdd ? negate(mirrored) : mirrored;
}

function undoInverse(argument: Expr, inverseName: FunctionName): Expr | null {
  return argument.type === 'func' && argument.name === inverseName ? argument.args[0] : null;
}

const ONE_RATIO = () => num(1);

export const sinDefinition: FunctionDefinition = {
  name: 'sin',
  latex: '\\sin',
  arity: 1,
  simplify: ([x]) => {
    const multiple = piMultiple(x);
    if (multiple) return exactSine(multiple) ?? reduceTrigCall('sin', multiple);
    return undoInverse(x, 'arcsin') ?? applySymmetry('sin', x, true);
  },
  evaluate: ([x]) => Math.sin(x),
  derivative: ([x], [dx]) => mul(func('cos', x), dx),
};

export const cosDefinition: FunctionDefinition = {
  name: 'cos',
  latex: '\\cos',
  arity: 1,
  simplify: ([x]) => {
    const multiple = piMultiple(x);
    if (multiple) return exactCosine(multiple) ?? reduceTrigCall('cos', multiple);
    return undoInverse(x, 'arccos') ?? applySymmetry('cos', x, false);
  },
  evaluate: ([x]) => Math.cos(x),
  derivative: ([x], [dx]) => mul(num(-1), func('sin', x), dx),
};

export const tanDefinition: FunctionDefinition = {
  name: 'tan',
  latex: '\\tan',
  arity: 1,
  simplify: ([x]) =>
    exactRatio('tan', x, { numerator: exactSine, denominator: exactCosine }) ??
    undoInverse(x, 'arctan') ??
    applySymmetry('tan', x, true),
  evaluate: ([x]) => Math.tan(x),
  derivative: ([x], [dx]) => mul(pow(func('sec', x), num(2)), dx),
};

export const secDefinition: FunctionDefinition = {
  name: 'sec',
  latex: '\\sec',
  arity: 1,
  simplify: ([x]) =>
    exactRatio('sec', x, { numerator: ONE_RATIO, denominator: exactCosine }) ?? applySymmetry('sec', x, false),
  evaluate: ([x]) => 1 / Math.cos(x),
  derivative: ([x], [dx]) => mul(func('sec', x), func('tan', x), dx),
};

export const cscDefinition: FunctionDefinition = {
  name: 'csc',
  latex: '\\csc',
  arity: 1,
  simplify: ([x]) =>
    exactRatio('csc', x, { numerator: ONE_RATIO, denominator: exactSine }) ?? applySymmetry('csc', x, true),
  evaluate: ([x]) => 1 / Math.sin(x),
  derivative: ([x], [dx]) => mul(num(-1), func('csc', x), func('cot', x), dx),
};

export const cotDefinition: FunctionDefinition = {
  name: 'cot',
  latex: '\\cot',
  arity: 1,
  simplify: ([x]) =>
    exactRatio('cot', x, { numerator: exactCosine, denominator: exactSine }) ?? applySymmetry('cot', x, true),
  evaluate: ([x]) => Math.cos(x) / Math.sin(x),
  derivative: ([x], [dx]) => mul(num(-1), pow(func('csc', x), num(2)), dx),
};
