import { type Expr } from '../../ast/nodes';
import { evaluate } from '../../evaluate/evaluate';
import { simplifyFunctionCall } from '../../operations/functions/apply';
import { exact } from '../types';
import type { InverseRule } from './types';

// arcsin u = r -> u = sin r, but only when r is inside arcsin's output range.
const TOLERANCE = 1e-12;
const HALF_PI = Math.PI / 2;

function isWithin(value: Expr, low: number, high: number, includeEnds: boolean): boolean {
  const number = evaluate(value);
  return includeEnds ? number >= low - TOLERANCE && number <= high + TOLERANCE : number > low && number < high;
}

export const invertArcsine: InverseRule = (value) =>
  isWithin(value, -HALF_PI, HALF_PI, true) ? [exact(simplifyFunctionCall('sin', [value]))] : [];

export const invertArccosine: InverseRule = (value) =>
  isWithin(value, 0, Math.PI, true) ? [exact(simplifyFunctionCall('cos', [value]))] : [];

export const invertArctangent: InverseRule = (value) =>
  isWithin(value, -HALF_PI, HALF_PI, false) ? [exact(simplifyFunctionCall('tan', [value]))] : [];
