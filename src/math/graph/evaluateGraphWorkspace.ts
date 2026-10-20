import { collectVariables } from '../ast/inspect';
import { subtract, type Statement } from '../ast/nodes';
import { calculateStatement, errorResult, type CalculationResult } from '../calculate';
import {
  prepareWorkspace,
  toStatement,
  workspaceLineResult,
  type PreparedWorkspace,
  type WorkspaceOptions,
} from '../workspace/evaluateWorkspace';
import { mentionsAxis, planPlot } from './planPlot';
import { DEFAULT_AXES, type GraphAxes, type GraphLineResult, type Plot } from './types';

/** An equation in two or more unknowns has nothing to show as text; its graph is the answer. */
function textResultFor(statement: Statement): CalculationResult {
  if (statement.kind === 'equation' && collectVariables(subtract(statement.left, statement.right)).length > 1) {
    return { kind: 'empty' };
  }
  return calculateStatement(statement);
}

function graphLineResult(workspace: PreparedWorkspace, index: number, statement: Statement, axes: GraphAxes): GraphLineResult {
  const latex = workspace.latexLines[index];
  let substituted: Statement;
  let plot: Plot | null;
  try {
    substituted = workspace.resolver.substituteStatement(statement);
    plot = planPlot(substituted, axes);
  } catch (error) {
    return { result: errorResult(error, latex), defines: null, plot: null };
  }
  // The text result can fail where the graph doesn't (e.g. no exact roots); keep the graph either way.
  try {
    return { result: textResultFor(substituted), defines: null, plot };
  } catch (error) {
    return { result: errorResult(error, latex), defines: null, plot };
  }
}

/**
 * Evaluate the graphing app's line list: like evaluateWorkspace, but the axis variables can't
 * be defined, and every line using them also says how to draw it.
 *
 * Args:
 *   latexLines: each line's LaTeX, in display order
 *   options: angle mode etc., applied to every line
 *   axes: the variables along each screen axis (x and y by default)
 *
 * Returns:
 *   One result per line: the text result, the variable it defines, and its plot (or null).
 */
export function evaluateGraphWorkspace(
  latexLines: string[],
  options: WorkspaceOptions = {},
  axes: GraphAxes = DEFAULT_AXES,
): GraphLineResult[] {
  const reservedVariables = [...(options.reservedVariables ?? []), axes.horizontal, axes.vertical];
  const workspace = prepareWorkspace(latexLines, { ...options, reservedVariables });
  return workspace.lines.map((line, index): GraphLineResult => {
    if (line.kind === 'expression' || line.kind === 'equation') {
      const statement = toStatement(line);
      if (workspace.plan.targets[index] === null && mentionsAxis(statement, axes)) {
        return graphLineResult(workspace, index, statement, axes);
      }
    }
    return { ...workspaceLineResult(workspace, index), plot: null };
  });
}
