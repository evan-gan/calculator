import type { Expr } from '../../ast/nodes';
import type { ExactSolution } from '../types';

export type { ExactSolution };

/**
 * Undo one function: given f(inner) = value, return the possible values of `inner`.
 * `args` are the function's arguments (args[0] is the one containing the unknown).
 * Return [] when there is no real solution.
 */
export type InverseRule = (value: Expr, args: Expr[]) => ExactSolution[];
