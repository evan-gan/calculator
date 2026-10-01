import type { ElementaryFunctionName } from '../../ast/nodes';
import { absDefinition } from './abs';
import { factorialDefinition } from './factorial';
import { arccosDefinition, arcsinDefinition, arctanDefinition } from './inverseTrig';
import { lnDefinition, logDefinition } from './logarithm';
import { cosDefinition, cotDefinition, cscDefinition, secDefinition, sinDefinition, tanDefinition } from './trig';
import type { FunctionDefinition } from './types';

// Built lazily because the function files import the simplifier, which imports this
// registry; building the table at module load could read those imports before they exist.
let registry: Record<ElementaryFunctionName, FunctionDefinition> | null = null;

function buildRegistry(): Record<ElementaryFunctionName, FunctionDefinition> {
  return {
    sin: sinDefinition,
    cos: cosDefinition,
    tan: tanDefinition,
    sec: secDefinition,
    csc: cscDefinition,
    cot: cotDefinition,
    arcsin: arcsinDefinition,
    arccos: arccosDefinition,
    arctan: arctanDefinition,
    ln: lnDefinition,
    log: logDefinition,
    abs: absDefinition,
    factorial: factorialDefinition,
  };
}

export function getFunction(name: ElementaryFunctionName): FunctionDefinition {
  registry ??= buildRegistry();
  return registry[name];
}
