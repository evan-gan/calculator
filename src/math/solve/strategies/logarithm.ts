import { containsVariable, toKey } from '../../ast/inspect';
import { E, mul, negate, pow, add, num, subtract, type Expr } from '../../ast/nodes';
import { splitCoefficient } from '../../operations/add';
import type { Strategy } from '../types';

// Several logs of the same base: combine with log a + log b = log(ab), then exponentiate.
// log₂x + log₂(x-2) = 3  ->  x(x-2) = 2³  ->  x = 4 (x = -2 fails the domain check later)

type LogTerm = { argument: Expr; base: Expr; coefficient: Expr };

function asLogTerm(term: Expr): LogTerm | null {
  const { coefficient, rest } = splitCoefficient(term);
  if (rest.length !== 1) return null;
  const call = rest[0];
  if (call.type !== 'func') return null;
  if (call.name === 'ln') return { argument: call.args[0], base: E, coefficient: num(coefficient) };
  if (call.name === 'log') return { argument: call.args[0], base: call.args[1], coefficient: num(coefficient) };
  return null;
}

export const logarithmStrategy: Strategy = (expr, context) => {
  if (expr.type !== 'add') return null;
  const logs: LogTerm[] = [];
  const constants: Expr[] = [];
  for (const term of expr.terms) {
    if (!containsVariable(term, context.variable)) {
      constants.push(term);
      continue;
    }
    const log = asLogTerm(term);
    if (!log || containsVariable(log.base, context.variable)) return null;
    logs.push(log);
  }
  if (logs.length < 2 || new Set(logs.map((log) => toKey(log.base))).size !== 1) return null;
  // Σ cᵢ·log(uᵢ) + K = 0  ->  Π uᵢ^cᵢ = base^(-K)
  const combinedArgument = mul(...logs.map((log) => pow(log.argument, log.coefficient)));
  const constantPart = constants.length > 0 ? add(...constants) : num(0);
  return context.solveNested(subtract(combinedArgument, pow(logs[0].base, negate(constantPart))));
};
