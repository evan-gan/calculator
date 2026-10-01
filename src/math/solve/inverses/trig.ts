import { num, PI, type Expr } from '../../ast/nodes';
import { evaluate } from '../../evaluate/evaluate';
import { differenceOf, productOf, quotientOf, reciprocalOf } from '../../operations/arithmetic';
import { simplifyFunctionCall } from '../../operations/functions/apply';
import { exact } from '../types';
import type { ExactSolution, InverseRule } from './types';

// General solutions of trig equations (n is any integer):
//   sin u = s  ->  u = arcsin s + 2πn  or  u = π - arcsin s + 2πn
//   cos u = c  ->  u = arccos c + 2πn  or  u = 2π - arccos c + 2πn
//   tan u = t  ->  u = arctan t + πn

const TOLERANCE = 1e-12;
const twoPi = () => productOf(num(2), PI);

function isOutsideUnitInterval(value: Expr): boolean {
  return Math.abs(evaluate(value)) > 1 + TOLERANCE;
}

function isPlusOrMinusOne(value: Expr): boolean {
  return Math.abs(Math.abs(evaluate(value)) - 1) < TOLERANCE;
}

function isZero(value: Expr): boolean {
  return Math.abs(evaluate(value)) < TOLERANCE;
}

export const invertSine: InverseRule = (value) => {
  if (isOutsideUnitInterval(value)) return [];
  const angle = simplifyFunctionCall('arcsin', [value]);
  if (isPlusOrMinusOne(value)) return [exact(angle, twoPi())];
  return [exact(angle, twoPi()), exact(differenceOf(PI, angle), twoPi())];
};

export const invertCosine: InverseRule = (value) => {
  if (isOutsideUnitInterval(value)) return [];
  const angle = simplifyFunctionCall('arccos', [value]);
  if (isPlusOrMinusOne(value)) return [exact(angle, twoPi())];
  return [exact(angle, twoPi()), exact(differenceOf(twoPi(), angle), twoPi())];
};

export const invertTangent: InverseRule = (value) => [exact(simplifyFunctionCall('arctan', [value]), PI)];

/** sec u = r  <=>  cos u = 1/r (no solution for r = 0). */
export const invertSecant: InverseRule = (value, args) => (isZero(value) ? [] : invertCosine(reciprocalOf(value), args));

export const invertCosecant: InverseRule = (value, args) => (isZero(value) ? [] : invertSine(reciprocalOf(value), args));

export const invertCotangent: InverseRule = (value, args): ExactSolution[] =>
  isZero(value) ? [exact(quotientOf(PI, num(2)), PI)] : invertTangent(reciprocalOf(value), args);
