import type { FunctionName } from '../../ast/nodes';
import { invertAbs } from './abs';
import { invertArccosine, invertArcsine, invertArctangent } from './inverseTrig';
import { invertLog, invertNaturalLog } from './logarithm';
import { invertCosecant, invertCosine, invertCotangent, invertSecant, invertSine, invertTangent } from './trig';
import type { InverseRule } from './types';

/** Functions the isolation solver can undo. Factorial has no inverse rule yet. */
export function getInverseRule(name: FunctionName): InverseRule | null {
  const rules: Partial<Record<FunctionName, InverseRule>> = {
    sin: invertSine,
    cos: invertCosine,
    tan: invertTangent,
    sec: invertSecant,
    csc: invertCosecant,
    cot: invertCotangent,
    arcsin: invertArcsine,
    arccos: invertArccosine,
    arctan: invertArctangent,
    ln: invertNaturalLog,
    log: invertLog,
    abs: invertAbs,
  };
  return rules[name] ?? null;
}
