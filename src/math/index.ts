// Public API of the math engine. The UI should import only from here.
export { calculate, type CalculationOptions, type CalculationResult, type ResultLine } from './calculate';
export type { AngleMode } from './transform/angleMode';
export type { SolutionDisplay } from './format/formatSolutions';
export { evaluateWorkspace, type WorkspaceOptions } from './workspace/evaluateWorkspace';
export type { LineResult } from './workspace/types';
export { evaluateGraphWorkspace } from './graph/evaluateGraphWorkspace';
export { traceCurve } from './graph/traceCurve';
export {
  DEFAULT_AXES,
  type GraphAxes,
  type GraphLineResult,
  type PixelSize,
  type Plot,
  type Point,
  type Polyline,
  type ViewWindow,
} from './graph/types';
export { evaluateNumberInput } from './evaluateNumber';
export type { MathErrorCategory } from './errors';
