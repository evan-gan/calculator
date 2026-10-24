import { collectVariables, substituteVariable } from '../ast/inspect';
import { subtract, type Expr, type Statement } from '../ast/nodes';
import { errorResult, type CalculationResult } from '../calculate';
import { MathError } from '../errors';
import { formatDefinition, formatSolveOutcome } from '../format/formatSolutions';
import { simplify } from '../simplify/simplify';
import { solveEquation } from '../solve/solveEquation';
import type { SolveOutcome } from '../solve/types';
import type { DefinitionPlan } from './assignDefinitions';
import type { ParsedLine, VariableValue } from './types';

/** Variable names are LaTeX (\theta); messages are plain text. */
export function displayName(variable: string): string {
  return variable.replace(/^\\/, '').replace(/_\{(.*)\}$/, '_$1');
}

const unavailable = (reason: string): VariableValue => ({ kind: 'unavailable', reason });

/** A single exact value other lines can substitute, or the reason there isn't one. */
function valueFromOutcome(variable: string, outcome: SolveOutcome): VariableValue {
  const name = displayName(variable);
  if (outcome.kind === 'noSolution') return unavailable(`${name} has no solution.`);
  if (outcome.kind === 'allReals') return unavailable(`${name} could be any number.`);
  const [first, ...others] = outcome.solutions;
  if (others.length > 0) {
    return unavailable(`${name} has ${outcome.solutions.length} solutions, so other lines can't use it as one value.`);
  }
  if (first.kind === 'approximate') return unavailable(`${name} has no exact value, so other lines can't use it.`);
  if (first.period) return unavailable(`${name} has infinitely many solutions, so other lines can't use it as one value.`);
  return { kind: 'value', expr: first.value };
}

/**
 * Works out each defined variable's value by following dependencies depth-first, so line
 * order never matters. A variable met again while its own definition is still being worked
 * out is a circular definition; every variable in that loop gets an error.
 */
export class DefinitionResolver {
  private readonly values = new Map<string, VariableValue>();
  private readonly lineResults = new Map<number, CalculationResult>();
  private readonly inProgress: string[] = [];
  private readonly cycleReasons = new Map<string, string>();

  constructor(
    private readonly lines: ParsedLine[],
    private readonly plan: DefinitionPlan,
  ) {}

  /** Value of a variable, or null if no line defines it (it stays a free variable). */
  valueOf(variable: string): VariableValue | null {
    if (this.plan.duplicates.has(variable)) return unavailable(`${displayName(variable)} is defined in more than one line.`);
    const lineIndex = this.plan.definers.get(variable);
    if (lineIndex === undefined) return null;
    const cached = this.values.get(variable);
    if (cached) return cached;

    const loopStart = this.inProgress.indexOf(variable);
    if (loopStart >= 0) return this.reportCycle([...this.inProgress.slice(loopStart), variable]);

    this.inProgress.push(variable);
    let { value, result } = this.computeDefinition(variable, lineIndex);
    this.inProgress.pop();
    const cycleReason = this.cycleReasons.get(variable);
    if (cycleReason) {
      value = unavailable(cycleReason);
      result = { kind: 'error', message: cycleReason, category: 'invalid' };
    }
    this.values.set(variable, value);
    this.lineResults.set(lineIndex, result);
    return value;
  }

  /** Result to show on a defining line (call valueOf for its variable first). */
  resultForLine(lineIndex: number): CalculationResult | undefined {
    return this.lineResults.get(lineIndex);
  }

  /** Replace every defined variable (except `keep`) with its value. Throws if one is unusable. */
  substituteKnown(expr: Expr, keep?: string): Expr {
    let substituted = expr;
    for (const variable of collectVariables(expr)) {
      if (variable === keep) continue;
      const value = this.valueOf(variable);
      if (value === null) continue;
      if (value.kind === 'unavailable') throw new MathError(`Can't use ${displayName(variable)}: ${value.reason}`, 'unresolved');
      substituted = substituteVariable(substituted, variable, value.expr);
    }
    return substituted;
  }

  substituteStatement(statement: Statement, keep?: string): Statement {
    if (statement.kind === 'expression') return { kind: 'expression', expr: this.substituteKnown(statement.expr, keep) };
    return {
      kind: 'equation',
      left: this.substituteKnown(statement.left, keep),
      right: this.substituteKnown(statement.right, keep),
    };
  }

  private reportCycle(cycle: string[]): VariableValue {
    const reason = `Circular definition: ${cycle.map(displayName).join(' → ')}.`;
    cycle.forEach((variable) => this.cycleReasons.set(variable, reason));
    return unavailable(reason);
  }

  private computeDefinition(variable: string, lineIndex: number): { value: VariableValue; result: CalculationResult } {
    const line = this.lines[lineIndex];
    if (line.kind !== 'equation') throw new Error(`Line ${lineIndex} defines ${variable} but is not an equation`);
    try {
      if (line.explicitTarget === variable) {
        const definition = line.left.type === 'var' && line.left.name === variable ? line.right : line.left;
        const value = simplify(this.substituteKnown(definition));
        return { value: { kind: 'value', expr: value }, result: { kind: 'solved', solutions: formatDefinition(variable, value) } };
      }
      const left = this.substituteKnown(line.left, variable);
      const right = this.substituteKnown(line.right, variable);
      const others = collectVariables(subtract(left, right)).filter((name) => name !== variable);
      if (others.length > 0) {
        throw new MathError(`Can't solve for ${displayName(variable)} while ${others.map(displayName).join(', ')} has no value.`, 'unresolved');
      }
      const outcome = solveEquation(left, right, variable);
      return { value: valueFromOutcome(variable, outcome), result: { kind: 'solved', solutions: formatSolveOutcome(outcome) } };
    } catch (error) {
      const result = errorResult(error, '');
      const reason = result.kind === 'error' ? result.message : 'its line has an error.';
      return { value: unavailable(reason), result };
    }
  }
}
