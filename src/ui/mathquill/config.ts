import type { MathFieldConfig } from './types';

// Every operator name here must also be understood by src/math/parse/tokenize.ts.
export const MATH_FIELD_CONFIG: MathFieldConfig = {
  spaceBehavesLikeTab: true,
  leftRightIntoCmdGoes: 'up',
  restrictMismatchedBrackets: true,
  sumStartsWithNEquals: true,
  supSubsRequireOperand: true,
  charsThatBreakOutOfSupSub: '+-=<>',
  // Off on purpose: in a solver, x2 silently becoming the new variable x₂ is more confusing than helpful.
  autoSubscriptNumerals: false,
  autoCommands: 'pi theta sqrt nthroot',
  autoOperatorNames: 'sin cos tan sec csc cot arcsin arccos arctan ln log exp abs',
};
