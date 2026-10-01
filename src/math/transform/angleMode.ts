import { constant, divide, func, mul, num, type Expr, type FunctionName, type Statement } from '../ast/nodes';

export type AngleMode = 'radians' | 'degrees';

const TRIG = new Set<FunctionName>(['sin', 'cos', 'tan', 'sec', 'csc', 'cot']);
const INVERSE_TRIG = new Set<FunctionName>(['arcsin', 'arccos', 'arctan']);

// The engine works in radians. Degree mode is a rewrite before simplifying:
// sin(u) -> sin(u·π/180) and arcsin(u) -> arcsin(u)·180/π.
// Solving needs nothing extra: sin(x) = 1/2 becomes sin(πx/180) = 1/2 -> x = 30 + 360n.

const degreesToRadians = () => divide(constant('pi'), num(180));
const radiansToDegrees = () => divide(num(180), constant('pi'));

export function convertToDegrees(expr: Expr): Expr {
  switch (expr.type) {
    case 'add':
      return { type: 'add', terms: expr.terms.map(convertToDegrees) };
    case 'mul':
      return { type: 'mul', factors: expr.factors.map(convertToDegrees) };
    case 'pow':
      return { type: 'pow', base: convertToDegrees(expr.base), exponent: convertToDegrees(expr.exponent) };
    case 'func': {
      const args = expr.args.map(convertToDegrees);
      if (TRIG.has(expr.name)) return func(expr.name, mul(args[0], degreesToRadians()));
      if (INVERSE_TRIG.has(expr.name)) return mul(func(expr.name, ...args), radiansToDegrees());
      return { ...expr, args };
    }
    default:
      return expr;
  }
}

/** Apply the angle mode to a parsed statement (radians leaves it unchanged). */
export function applyAngleMode(statement: Statement, mode: AngleMode): Statement {
  if (mode === 'radians') return statement;
  if (statement.kind === 'expression') return { kind: 'expression', expr: convertToDegrees(statement.expr) };
  return { kind: 'equation', left: convertToDegrees(statement.left), right: convertToDegrees(statement.right) };
}
