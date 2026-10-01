import { num } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { negated } from '../../operations/arithmetic';
import { exact } from '../types';
import type { InverseRule } from './types';

/** |u| = r -> u = ±r for r > 0, u = 0 for r = 0, nothing for r < 0. */
export const invertAbs: InverseRule = (value) => {
  const sign = numericSign(value);
  if (sign === null || sign < 0) return [];
  if (sign === 0) return [exact(num(0))];
  return [exact(value), exact(negated(value))];
};
