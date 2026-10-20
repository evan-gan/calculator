import type { Statement } from '../ast/nodes';
import { calculateStatement, errorResult, type CalculationOptions, type CalculationResult } from '../calculate';
import { assignDefinitions, type DefinitionPlan } from './assignDefinitions';
import { parseLines } from './parseLines';
import { DefinitionResolver, displayName } from './resolveDefinitions';
import type { LineResult, ParsedLine } from './types';

export interface WorkspaceOptions extends CalculationOptions {
  /** Variables no line may define, so they stay free (the graphing app reserves x and y). */
  reservedVariables?: string[];
}

/** Every line parsed, with definitions assigned and resolved, ready for per-line results. */
export interface PreparedWorkspace {
  latexLines: string[];
  lines: ParsedLine[];
  plan: DefinitionPlan;
  resolver: DefinitionResolver;
}

export function toStatement(line: Extract<ParsedLine, { kind: 'expression' | 'equation' }>): Statement {
  return line.kind === 'expression'
    ? { kind: 'expression', expr: line.expr }
    : { kind: 'equation', left: line.left, right: line.right };
}

export function prepareWorkspace(latexLines: string[], options: WorkspaceOptions = {}): PreparedWorkspace {
  const lines = parseLines(latexLines, options);
  const plan = assignDefinitions(lines, new Set(options.reservedVariables ?? []));
  const resolver = new DefinitionResolver(lines, plan);
  for (const variable of plan.definers.keys()) resolver.valueOf(variable);
  return { latexLines, lines, plan, resolver };
}

/** The result one line shows, using every other line's definitions. Never throws. */
export function workspaceLineResult(workspace: PreparedWorkspace, index: number): LineResult {
  const { lines, plan, resolver, latexLines } = workspace;
  const line = lines[index];
  if (line.kind === 'empty') return { result: { kind: 'empty' }, defines: null };
  if (line.kind === 'invalid') return { result: line.result, defines: null };
  const target = plan.targets[index];
  if (target !== null && plan.duplicates.has(target)) {
    return { result: { kind: 'error', message: `${displayName(target)} is defined in more than one line.` }, defines: null };
  }
  if (target !== null) {
    const result: CalculationResult = resolver.resultForLine(index) ?? { kind: 'empty' };
    return { result, defines: target };
  }
  try {
    return { result: calculateStatement(resolver.substituteStatement(toStatement(line))), defines: null };
  } catch (error) {
    return { result: errorResult(error, latexLines[index]), defines: null };
  }
}

/**
 * Evaluate every line of the expression list together. Lines can use variables defined or
 * solved on any other line (above or below); circular definitions are reported as errors.
 *
 * Args:
 *   latexLines: each line's LaTeX, in display order
 *   options: angle mode etc., applied to every line
 *
 * Returns:
 *   One result per line, plus which variable (if any) the line defines.
 */
export function evaluateWorkspace(latexLines: string[], options: WorkspaceOptions = {}): LineResult[] {
  const workspace = prepareWorkspace(latexLines, options);
  return latexLines.map((_, index) => workspaceLineResult(workspace, index));
}
