import { collectVariables, containsVariable } from '../ast/inspect';
import { subtract, type Expr, type Statement } from '../ast/nodes';
import { MathError } from '../errors';
import { simplify } from '../simplify/simplify';
import { displayName } from '../workspace/resolveDefinitions';
import type { GraphAxes, Plot } from './types';

function axisVariables(axes: GraphAxes): Set<string> {
  return new Set([axes.horizontal, axes.vertical]);
}

/** True when the statement mentions either axis variable, i.e. the graphing app should try to draw it. */
export function mentionsAxis(statement: Statement, axes: GraphAxes): boolean {
  const variables = statementVariables(statement);
  return variables.includes(axes.horizontal) || variables.includes(axes.vertical);
}

function statementVariables(statement: Statement): string[] {
  return statement.kind === 'expression'
    ? collectVariables(statement.expr)
    : collectVariables(subtract(statement.left, statement.right));
}

/** Variables that are neither axis: the graph can't be drawn until each has a value. */
function rejectFreeVariables(variables: string[], axes: GraphAxes): void {
  const axisNames = axisVariables(axes);
  const free = variables.filter((variable) => !axisNames.has(variable));
  if (free.length === 0) return;
  const names = free.map(displayName);
  const subject = names.length === 1 ? `${names[0]} needs a value` : `${names.join(', ')} need values`;
  throw new MathError(`To graph this, ${subject}: add a line like ${names[0]} = 1.`, 'unresolved');
}

/** `v = f(u)` (either side) where the lone variable doesn't appear in f. */
function explicitSide(left: Expr, right: Expr, name: string): Expr | null {
  if (left.type === 'var' && left.name === name && !containsVariable(right, name)) return right;
  if (right.type === 'var' && right.name === name && !containsVariable(left, name)) return left;
  return null;
}

function planEquation(left: Expr, right: Expr, axes: GraphAxes): Plot {
  const verticalAsFunction = explicitSide(left, right, axes.vertical);
  if (verticalAsFunction) {
    return { kind: 'explicit', along: 'horizontal', input: axes.horizontal, expr: simplify(verticalAsFunction) };
  }
  const horizontalAsFunction = explicitSide(left, right, axes.horizontal);
  if (horizontalAsFunction) {
    return { kind: 'explicit', along: 'vertical', input: axes.vertical, expr: simplify(horizontalAsFunction) };
  }
  return { kind: 'implicit', horizontal: axes.horizontal, vertical: axes.vertical, expr: simplify(subtract(left, right)) };
}

/**
 * Decide how to draw a statement whose definitions are already substituted.
 * An expression in the horizontal variable alone is graphed as `vertical = expression`
 * (`x²` draws y = x²); an equation using only the axis variables is drawn explicitly when one
 * side is a lone axis variable, else as an implicit curve.
 *
 * Returns:
 *   The plot, or null when the statement isn't something to graph (a plain number, or an
 *   expression that uses the vertical variable).
 *
 * Throws:
 *   MathError when the statement uses a variable with no value, or simplifying fails (1/0).
 */
export function planPlot(statement: Statement, axes: GraphAxes): Plot | null {
  const variables = statementVariables(statement);
  if (!mentionsAxis(statement, axes)) return null;
  rejectFreeVariables(variables, axes);
  if (statement.kind === 'equation') return planEquation(statement.left, statement.right, axes);
  if (variables.includes(axes.vertical)) return null;
  return { kind: 'explicit', along: 'horizontal', input: axes.horizontal, expr: simplify(statement.expr) };
}
