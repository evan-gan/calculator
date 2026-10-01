import { containsVariable } from '../ast/inspect';
import { num, type Expr } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';
import { differenceOf, quotientOf, sumOf } from '../operations/arithmetic';
import type { Rational } from '../number/rational';
import type { ExactSolution, Solution, SolveOutcome } from '../solve/types';
import { floatToLatex, rationalToDecimalLatex, SIGNIFICANT_DIGITS } from './toDecimal';
import { plusMinusToLatex, toLatex } from './toLatex';
import { toDecimalLatexWithVariables } from './decimalize';

/** Ready-to-render LaTeX lines for a solve result, in both display modes. */
export interface SolutionDisplay {
  exactLines: string[];
  decimalLines: string[];
  notes: string[];
}

const LIST_SEPARATOR = ',\\ ';

/** True when the decimal expansion ends within the shown digits (1/8 = 0.125 but not 1/3). */
export function isTerminatingDecimal(value: Rational): boolean {
  let denominator = value.denominator;
  for (const prime of [2n, 5n]) while (denominator % prime === 0n) denominator /= prime;
  return denominator === 1n && rationalToDecimalLatex(value).replace(/[^0-9]/g, '').length <= SIGNIFICANT_DIGITS;
}

export function decimalRelation(expr: Expr): string {
  return expr.type === 'num' && isTerminatingDecimal(expr.value) ? '=' : '\\approx ';
}

/**
 * Group exact roots into ± pairs where that reads better: 3 ± √5, ±2.
 * A pair is merged when its midpoint is zero, or rational with an irrational offset.
 */
function pairPlusMinus(solutions: ExactSolution[]): string[] {
  const remaining = [...solutions];
  // Sorted by (center, offset) afterwards so ±1 comes before ±2.
  const pieces: { latex: string; center: number; offset: number }[] = [];
  while (remaining.length > 0) {
    const current = remaining.shift()!;
    const partnerIndex = remaining.findIndex((other) => {
      const center = quotientOf(sumOf(current.value, other.value), num(2));
      const offset = quotientOf(differenceOf(other.value, current.value), num(2));
      const isZeroCenter = center.type === 'num' && center.value.isZero();
      return isZeroCenter || (center.type === 'num' && offset.type !== 'num' && !containsVariable(offset));
    });
    if (partnerIndex < 0) {
      pieces.push({ latex: toLatex(current.value), center: evaluate(current.value), offset: 0 });
      continue;
    }
    const [partner] = remaining.splice(partnerIndex, 1);
    const center = quotientOf(sumOf(current.value, partner.value), num(2));
    const offset = quotientOf(differenceOf(partner.value, current.value), num(2));
    // Sorted ascending means partner > current, so the offset is positive.
    pieces.push({ latex: plusMinusToLatex(center, offset), center: evaluate(center), offset: evaluate(offset) });
  }
  pieces.sort((first, second) => first.center - second.center || first.offset - second.offset);
  return pieces.map((piece) => piece.latex);
}

function periodicLine(variable: string, solution: ExactSolution, decimal: boolean): string {
  const period = solution.period!;
  if (!decimal) {
    const isZeroValue = solution.value.type === 'num' && solution.value.value.isZero();
    const periodText = `${toLatex(period)} n`;
    return `${variable}=${isZeroValue ? periodText : `${toLatex(solution.value)}+${periodText}`}`;
  }
  const valueNumber = evaluate(solution.value);
  const periodText = `${floatToLatex(evaluate(period))}n`;
  return `${variable}\\approx ${valueNumber === 0 ? periodText : `${floatToLatex(valueNumber)}+${periodText}`}`;
}

function decimalList(variable: string, values: Expr[] | number[]): string {
  const allExact = values.every(
    (value) => typeof value !== 'number' && (containsVariable(value) || decimalRelation(value) === '='),
  );
  const texts = values.map((value) => {
    if (typeof value === 'number') return floatToLatex(value);
    if (value.type === 'num') return rationalToDecimalLatex(value.value);
    // A definition like y = 2x keeps its variables; only the numbers become decimals.
    return containsVariable(value) ? toDecimalLatexWithVariables(value) : floatToLatex(evaluate(value));
  });
  return `${variable}${allExact ? '=' : '\\approx '}${texts.join(LIST_SEPARATOR)}`;
}

function formatSolutionList(variable: string, solutions: Solution[]): SolutionDisplay {
  const exactSolutions = solutions.filter((solution): solution is ExactSolution => solution.kind === 'exact');
  const plain = exactSolutions.filter((solution) => !solution.period);
  const periodic = exactSolutions.filter((solution) => solution.period);
  const approximate = solutions.flatMap((solution) => (solution.kind === 'approximate' ? [solution.value] : []));

  const exactLines: string[] = [];
  const decimalLines: string[] = [];
  const notes: string[] = [];
  if (plain.length > 0) {
    exactLines.push(`${variable}=${pairPlusMinus(plain).join(LIST_SEPARATOR)}`);
    decimalLines.push(decimalList(variable, plain.map((solution) => solution.value)));
  }
  for (const solution of periodic) {
    exactLines.push(periodicLine(variable, solution, false));
    decimalLines.push(periodicLine(variable, solution, true));
  }
  if (periodic.length > 0) notes.push('n can be any integer.');
  if (approximate.length > 0) {
    const line = decimalList(variable, approximate);
    exactLines.push(line);
    decimalLines.push(line);
    notes.push('No exact form was found, so these values are approximate.');
  }
  return { exactLines, decimalLines, notes };
}

export function formatSolveOutcome(outcome: SolveOutcome): SolutionDisplay {
  const variable = outcome.variable;
  switch (outcome.kind) {
    case 'noSolution':
      return { exactLines: [], decimalLines: [], notes: ['No real solution.'] };
    case 'allReals': {
      if (outcome.excluded.length === 0) {
        return { exactLines: [], decimalLines: [], notes: [`Every real number is a solution for ${variable}.`] };
      }
      const excludedDisplay = formatSolutionList(variable, outcome.excluded);
      const toExclusion = (line: string) => line.replace(/^(.*?)(=|\\approx )/, (_, name: string) => `${name}\\ne `);
      return {
        exactLines: excludedDisplay.exactLines.map(toExclusion),
        decimalLines: excludedDisplay.decimalLines.map(toExclusion),
        notes: ['Every other real number is a solution (the equation is undefined at these values).'],
      };
    }
    case 'solutions':
      return formatSolutionList(variable, outcome.solutions);
  }
}

/** Display for a definition line such as y = 2x + 1 (its value, which may contain free variables). */
export function formatDefinition(variable: string, value: Expr): SolutionDisplay {
  return formatSolutionList(variable, [{ kind: 'exact', value }]);
}
