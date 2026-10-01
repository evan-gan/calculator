import { containsVariable, substituteVariable } from '../ast/inspect';
import { fraction, func, num, PI, type Expr } from '../ast/nodes';
import { MathError } from '../errors';
import { evaluate } from '../evaluate/evaluate';
import { productOf, sumOf } from '../operations/arithmetic';
import { termsOf } from '../operations/expand';
import { simplify } from '../simplify/simplify';
import { toPolynomial } from '../solve/polynomial/extract';
import { linearParts } from './integrate/linear';

// Exact limits of antiderivatives at the ends of improper integrals: x → ±∞ for ∫_0^∞ e^(-x) dx,
// and one-sided limits at points where F itself is undefined (x ln x - x at 0 for ∫_0^1 ln x dx).
// Only the shapes integration produces are recognised: terms that die out, arctan of a linear
// argument, and logarithms of polynomials whose growth cancels. Anything else returns null and
// the caller falls back to a numeric value (which also double-checks every exact answer).

const INFINITY_PROBES = [1e4, 1e8, 1e16, 1e32];
// Relative distances from a finite point; much closer and x + h rounds back to x itself.
const POINT_PROBES = [1e-4, 1e-6, 1e-8, 1e-10];

/** True when the values visibly shrink towards 0 and end below `threshold`. */
function shrinksToZero(values: number[], threshold: number): boolean {
  const magnitudes = values.map(Math.abs);
  if (magnitudes.some((magnitude) => !Number.isFinite(magnitude))) return false;
  const shrinking = magnitudes.every((magnitude, index) => index === 0 || magnitude <= magnitudes[index - 1] * (1 + 1e-12));
  return shrinking && magnitudes[magnitudes.length - 1] < threshold;
}

function vanishes(term: Expr, variable: string, direction: 1 | -1): boolean {
  return shrinksToZero(INFINITY_PROBES.map((probe) => evaluate(term, { [variable]: direction * probe })), 1e-12);
}

function vanishesNear(term: Expr, variable: string, point: number, side: 1 | -1): boolean {
  const scale = Math.max(1, Math.abs(point));
  return shrinksToZero(POINT_PROBES.map((probe) => evaluate(term, { [variable]: point + side * probe * scale })), 1e-8);
}

function valueAt(term: Expr, variable: string, point: Expr): Expr | null {
  try {
    return simplify(substituteVariable(term, variable, point));
  } catch (error) {
    // Undefined exactly at the point (ln 0); the caller looks at the one-sided limit instead.
    if (error instanceof MathError) return null;
    throw error;
  }
}

/**
 * lim F(x) as x → point from one side (side = +1 from above). Terms defined at the point are
 * plugged in; the others must visibly shrink to 0 (x ln x → 0), otherwise the result is null.
 */
export function limitAtPoint(expr: Expr, variable: string, point: Expr, side: 1 | -1): Expr | null {
  const pointValue = evaluate(point);
  const kept: Expr[] = [];
  for (const term of termsOf(expr)) {
    const value = valueAt(term, variable, point);
    if (value && Number.isFinite(evaluate(value))) kept.push(value);
    else if (!Number.isFinite(pointValue) || !vanishesNear(term, variable, pointValue, side)) return null;
  }
  return sumOf(...kept);
}

function splitConstant(term: Expr, variable: string): { constant: Expr; rest: Expr } {
  const factors = term.type === 'mul' ? term.factors : [term];
  return {
    constant: productOf(...factors.filter((factor) => !containsVariable(factor, variable))),
    rest: productOf(...factors.filter((factor) => containsVariable(factor, variable))),
  };
}

/** c·arctan(ax + b) → c·sign(a·direction)·π/2 */
function arctanLimit(term: Expr, variable: string, direction: 1 | -1): Expr | null {
  const { constant, rest } = splitConstant(term, variable);
  if (rest.type !== 'func' || rest.name !== 'arctan') return null;
  const linear = linearParts(rest.args[0], variable);
  const slope = linear && evaluate(linear.slope);
  if (!slope) return null;
  return productOf(constant, num(Math.sign(slope) * direction), fraction(1, 2), PI);
}

type LogTerm = { scale: Expr; degree: number; leading: Expr };

/** c·ln|P(x)| or c·ln(P(x)) for a polynomial P: its scale, degree and leading coefficient. */
function asLogOfPolynomial(term: Expr, variable: string): LogTerm | null {
  const { constant, rest } = splitConstant(term, variable);
  if (rest.type !== 'func' || rest.name !== 'ln') return null;
  const inner = rest.args[0].type === 'func' && rest.args[0].name === 'abs' ? rest.args[0].args[0] : rest.args[0];
  const coefficients = toPolynomial(inner, variable);
  if (!coefficients || coefficients.length < 2) return null;
  return { scale: constant, degree: coefficients.length - 1, leading: coefficients[coefficients.length - 1] };
}

/**
 * Σ cᵢ ln|Pᵢ| behaves like (Σ cᵢ·degᵢ)·ln|x| + Σ cᵢ ln|leadᵢ|, so it has a finite limit
 * exactly when the growth rates cancel.
 */
function logarithmsLimit(terms: LogTerm[]): Expr | null {
  const growth = simplify(sumOf(...terms.map(({ scale, degree }) => productOf(scale, num(degree)))));
  if (!(growth.type === 'num' && growth.value.isZero())) return null;
  return sumOf(...terms.map(({ scale, leading }) => productOf(scale, simplify(func('ln', func('abs', leading))))));
}

/** lim F(x) as x → direction·∞, exactly, or null when it can't be found (or doesn't exist). */
export function limitAtInfinity(expr: Expr, variable: string, direction: 1 | -1): Expr | null {
  const kept: Expr[] = [];
  const logTerms: LogTerm[] = [];
  for (const term of termsOf(expr)) {
    if (!containsVariable(term, variable)) {
      kept.push(term);
      continue;
    }
    if (vanishes(term, variable, direction)) continue;
    const arctan = arctanLimit(term, variable, direction);
    if (arctan) {
      kept.push(arctan);
      continue;
    }
    const logTerm = asLogOfPolynomial(term, variable);
    if (!logTerm) return null;
    logTerms.push(logTerm);
  }
  if (logTerms.length > 0) {
    const logs = logarithmsLimit(logTerms);
    if (!logs) return null;
    kept.push(logs);
  }
  return sumOf(...kept);
}
