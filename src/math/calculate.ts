import { collectVariables } from './ast/inspect';
import { num, subtract, type Expr, type Statement } from './ast/nodes';
import { MathError } from './errors';
import { numericSign } from './evaluate/evaluate';
import { decimalRelation, formatSolveOutcome, type SolutionDisplay } from './format/formatSolutions';
import { toDecimalLatexWithVariables } from './format/decimalize';
import { exprToDecimalLatex } from './format/toDecimal';
import { toLatex } from './format/toLatex';
import { parseLatex } from './parse/parser';
import { simplify } from './simplify/simplify';
import { solveEquation } from './solve/solveEquation';
import { applyAngleMode, type AngleMode } from './transform/angleMode';

/** An answer in both display modes. Each string is LaTeX including its leading = or ≈. */
export interface ResultLine {
  exact: string;
  decimal: string;
}

export type CalculationResult =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  /** A number: 0.1 + 0.2 = 3/10 */
  | { kind: 'value'; result: ResultLine }
  /** An expression with variables, simplified. `roots` is filled in when it has one variable. */
  | { kind: 'simplified'; result: ResultLine; roots: SolutionDisplay | null; variable: string | null }
  /** An equation in one unknown, solved. */
  | { kind: 'solved'; solutions: SolutionDisplay }
  /** An equation without variables, checked: 2 + 2 = 4 */
  | { kind: 'truth'; isTrue: boolean };

function evaluateNumber(expr: Expr): CalculationResult {
  const exact = simplify(expr);
  const decimal = exprToDecimalLatex(exact);
  return { kind: 'value', result: { exact: `=${toLatex(exact)}`, decimal: `${decimalRelation(exact)}${decimal}` } };
}

function simplifyWithVariables(expr: Expr, variables: string[]): CalculationResult {
  const simplified = simplify(expr);
  const result = { exact: `=${toLatex(simplified)}`, decimal: `=${toDecimalLatexWithVariables(simplified)}` };
  if (variables.length !== 1) return { kind: 'simplified', result, roots: null, variable: null };
  // With a single variable, also report where the expression equals zero.
  const outcome = solveEquation(expr, num(0), variables[0]);
  const roots = outcome.kind === 'solutions' ? formatSolveOutcome(outcome) : null;
  return { kind: 'simplified', result, roots, variable: variables[0] };
}

function checkEquality(left: Expr, right: Expr): CalculationResult {
  const difference = simplify(subtract(left, right));
  if (difference.type === 'num') return { kind: 'truth', isTrue: difference.value.isZero() };
  return { kind: 'truth', isTrue: numericSign(difference) === 0 };
}

function solveSingleUnknown(left: Expr, right: Expr): CalculationResult {
  const variables = collectVariables(subtract(left, right));
  if (variables.length === 0) return checkEquality(left, right);
  if (variables.length > 1) {
    throw new MathError(`Solving works with one unknown at a time, but this equation has ${variables.join(', ')}.`);
  }
  return { kind: 'solved', solutions: formatSolveOutcome(solveEquation(left, right, variables[0])) };
}

export interface CalculationOptions {
  /** How trig functions read their angles. Defaults to radians. */
  angleMode?: AngleMode;
}

/** Compute the result for an already-parsed statement. Throws MathError for bad input. */
export function calculateStatement(statement: Statement): CalculationResult {
  if (statement.kind === 'equation') return solveSingleUnknown(statement.left, statement.right);
  const variables = collectVariables(statement.expr);
  return variables.length === 0 ? evaluateNumber(statement.expr) : simplifyWithVariables(statement.expr, variables);
}

/** Parse one line of LaTeX and apply the angle mode. Throws MathError for bad syntax. */
export function parseLine(latex: string, options: CalculationOptions = {}): Statement {
  return applyAngleMode(parseLatex(latex), options.angleMode ?? 'radians');
}

/**
 * Turn a thrown error into an error result. MathErrors are the user's to fix; anything
 * else is a bug, so it is logged with the input for debugging.
 */
export function errorResult(error: unknown, latex: string): CalculationResult {
  if (error instanceof MathError) return { kind: 'error', message: error.message };
  console.error('Calculator internal error while evaluating', latex, error);
  const detail = error instanceof Error ? error.message : String(error);
  return { kind: 'error', message: `Internal calculator error (${detail}). Please report this input.` };
}

/**
 * Calculate a single line on its own (no other lines' variables).
 * Never throws; problems come back as { kind: 'error' }.
 */
export function calculate(latex: string, options: CalculationOptions = {}): CalculationResult {
  if (latex.trim() === '') return { kind: 'empty' };
  try {
    return calculateStatement(parseLine(latex, options));
  } catch (error) {
    return errorResult(error, latex);
  }
}
