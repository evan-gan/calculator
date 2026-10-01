// Public API of the math engine. The UI should import only from here.
export { calculate, type CalculationOptions, type CalculationResult, type ResultLine } from './calculate';
export type { AngleMode } from './transform/angleMode';
export type { SolutionDisplay } from './format/formatSolutions';
export { evaluateWorkspace } from './workspace/evaluateWorkspace';
export type { LineResult } from './workspace/types';
