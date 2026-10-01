import { num } from '../../ast/nodes';
import { MathError } from '../../errors';
import type { FunctionDefinition } from './types';

// Larger factorials have tens of thousands of digits and would stall the page.
const MAX_FACTORIAL_INPUT = 3000n;

export const factorialDefinition: FunctionDefinition = {
  name: 'factorial',
  latex: '!',
  arity: 1,
  simplify: ([n]) => {
    if (n.type !== 'num') return null;
    if (!n.value.isInteger() || n.value.isNegative()) {
      throw new MathError('Factorial is only defined for whole numbers (0, 1, 2, …).');
    }
    if (n.value.numerator > MAX_FACTORIAL_INPUT) {
      throw new MathError(`Factorials above ${MAX_FACTORIAL_INPUT}! are too large to compute exactly.`);
    }
    let product = 1n;
    for (let factor = 2n; factor <= n.value.numerator; factor++) product *= factor;
    return num(product);
  },
  evaluate: ([n]) => {
    if (!Number.isInteger(n) || n < 0) return NaN;
    let product = 1;
    for (let factor = 2; factor <= n; factor++) product *= factor;
    return product;
  },
};
