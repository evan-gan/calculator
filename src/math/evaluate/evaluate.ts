import { isConstantExpr } from '../ast/inspect';
import type { Expr } from '../ast/nodes';
import { MathError } from '../errors';
import type { Rational } from '../number/rational';
import { simplify } from '../simplify/simplify';
import { getFunction } from '../operations/functions/registry';

/** Values to plug in for variables when evaluating numerically. */
export type VariableValues = Record<string, number>;

/**
 * Evaluate an expression to a float. Used for decimal display, sign checks and verifying
 * solutions. Returns NaN for anything outside the real domain (or unknown variables) instead
 * of throwing, so callers can treat "not a real number" as a normal outcome.
 */
export function evaluate(expr: Expr, values: VariableValues = {}): number {
  switch (expr.type) {
    case 'num':
      return expr.value.toNumber();
    case 'const':
      return expr.name === 'pi' ? Math.PI : Math.E;
    case 'var':
      return values[expr.name] ?? NaN;
    case 'add':
      return expr.terms.reduce((sum, term) => sum + evaluate(term, values), 0);
    case 'mul':
      return expr.factors.reduce((product, factor) => product * evaluate(factor, values), 1);
    case 'pow':
      return evaluatePower(expr.base, expr.exponent, values);
    case 'func':
      return getFunction(expr.name).evaluate(expr.args.map((arg) => evaluate(arg, values)));
  }
}

/** Exact rational value of a constant exponent like 1/3 (written raw as 3^-1), if it has one. */
function exactExponent(exponentExpr: Expr): Rational | null {
  if (exponentExpr.type === 'num') return exponentExpr.value;
  if (!isConstantExpr(exponentExpr)) return null;
  try {
    const simplified = simplify(exponentExpr);
    return simplified.type === 'num' ? simplified.value : null;
  } catch (error) {
    if (error instanceof MathError) return null; // e.g. 1/0 in the exponent: no real value
    throw error;
  }
}

function evaluatePower(baseExpr: Expr, exponentExpr: Expr, values: VariableValues): number {
  const base = evaluate(baseExpr, values);
  const exponent = evaluate(exponentExpr, values);
  if (base === 0 && exponent < 0) return NaN;
  // Math.pow returns NaN for negative bases with fractional exponents, but an exact
  // exponent with an odd denominator (like 1/3) has a real answer: cbrt(-8) = -2.
  const rationalExponent = base < 0 ? exactExponent(exponentExpr) : null;
  if (rationalExponent && !rationalExponent.isInteger()) {
    const { numerator, denominator } = rationalExponent;
    if (denominator % 2n === 0n) return NaN;
    const magnitude = Math.pow(-base, exponent);
    return numerator % 2n === 0n ? magnitude : -magnitude;
  }
  return Math.pow(base, exponent);
}

// Treat values this close to zero as zero when deciding signs of exact constants.
export const SIGN_TOLERANCE = 1e-12;

/** Sign of a variable-free expression: -1, 0 or 1, or null if it isn't a real number. */
export function numericSign(expr: Expr): -1 | 0 | 1 | null {
  const value = evaluate(expr);
  if (!Number.isFinite(value)) return null;
  if (Math.abs(value) <= SIGN_TOLERANCE * Math.max(1, Math.abs(value))) return 0;
  return value < 0 ? -1 : 1;
}
