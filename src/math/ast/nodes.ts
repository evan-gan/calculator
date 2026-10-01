import { Rational } from '../number/rational';

// Expression tree shared by every part of the math engine.
// Subtraction is stored as adding a negative and division as a power of -1,
// so the simplifier only needs rules for add, multiply and power.

export type FunctionName =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'sec'
  | 'csc'
  | 'cot'
  | 'arcsin'
  | 'arccos'
  | 'arctan'
  | 'ln'
  | 'log'
  | 'abs'
  | 'factorial';

export type ConstantName = 'pi' | 'e';

export type NumberNode = { type: 'num'; value: Rational };
export type ConstantNode = { type: 'const'; name: ConstantName };
export type VariableNode = { type: 'var'; name: string };
export type SumNode = { type: 'add'; terms: Expr[] };
export type ProductNode = { type: 'mul'; factors: Expr[] };
export type PowerNode = { type: 'pow'; base: Expr; exponent: Expr };
/** `log` takes [argument, base]; every other function takes one argument. */
export type FunctionNode = { type: 'func'; name: FunctionName; args: Expr[] };

export type Expr = NumberNode | ConstantNode | VariableNode | SumNode | ProductNode | PowerNode | FunctionNode;

/** A parsed input line: either a plain expression or `left = right`. */
export type Statement = { kind: 'expression'; expr: Expr } | { kind: 'equation'; left: Expr; right: Expr };

// ---- Raw constructors (no simplification happens here) ----

export function num(value: Rational | number | bigint): NumberNode {
  return { type: 'num', value: value instanceof Rational ? value : Rational.fromInt(value) };
}

export function fraction(numerator: number | bigint, denominator: number | bigint): NumberNode {
  return { type: 'num', value: new Rational(BigInt(numerator), BigInt(denominator)) };
}

export function constant(name: ConstantName): ConstantNode {
  return { type: 'const', name };
}

export function variable(name: string): VariableNode {
  return { type: 'var', name };
}

export function add(...terms: Expr[]): SumNode {
  return { type: 'add', terms };
}

export function mul(...factors: Expr[]): ProductNode {
  return { type: 'mul', factors };
}

export function pow(base: Expr, exponent: Expr): PowerNode {
  return { type: 'pow', base, exponent };
}

export function func(name: FunctionName, ...args: Expr[]): FunctionNode {
  return { type: 'func', name, args };
}

export function negate(expr: Expr): ProductNode {
  return mul(num(-1), expr);
}

export function subtract(left: Expr, right: Expr): SumNode {
  return add(left, negate(right));
}

export function divide(numerator: Expr, denominator: Expr): ProductNode {
  return mul(numerator, pow(denominator, num(-1)));
}

export function sqrt(radicand: Expr): PowerNode {
  return pow(radicand, fraction(1, 2));
}

export const ZERO = num(0);
export const ONE = num(1);
export const PI = constant('pi');
export const E = constant('e');

// ---- Type guards ----

export function isNum(expr: Expr): expr is NumberNode {
  return expr.type === 'num';
}

export function isNumValue(expr: Expr, value: number): boolean {
  return expr.type === 'num' && expr.value.equals(Rational.fromInt(value));
}

export function isInteger(expr: Expr): expr is NumberNode {
  return expr.type === 'num' && expr.value.isInteger();
}
