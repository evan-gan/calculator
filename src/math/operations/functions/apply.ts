import { func, type ElementaryFunctionName, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { simplify } from '../../simplify/simplify';
import { getFunction } from './registry';

/** Simplify a function call whose arguments are already simplified. */
export function simplifyFunctionCall(name: ElementaryFunctionName, args: Expr[]): Expr {
  const definition = getFunction(name);
  if (args.length !== definition.arity) {
    throw new MathError(`${name} expects ${definition.arity} input(s) but got ${args.length}.`);
  }
  const replacement = definition.simplify(args);
  return replacement ? simplify(replacement) : func(name, ...args);
}
