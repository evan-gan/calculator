import { E } from '../../ast/nodes';
import { powerOf } from '../../operations/arithmetic';
import { exact } from '../types';
import type { InverseRule } from './types';

// ln u = r -> u = e^r;  log_b u = r -> u = b^r. Always one solution; the domain
// check (u > 0) happens automatically because b^r is positive.

export const invertNaturalLog: InverseRule = (value) => [exact(powerOf(E, value))];

export const invertLog: InverseRule = (value, args) => [exact(powerOf(args[1], value))];
