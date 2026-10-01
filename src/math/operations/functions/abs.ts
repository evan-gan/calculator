import { func, num } from '../../ast/nodes';
import { numericSign } from '../../evaluate/evaluate';
import { isConstantExpr } from '../../ast/inspect';
import { negated } from '../arithmetic';
import { hasNegativeSign } from '../sign';
import type { FunctionDefinition } from './types';

export const absDefinition: FunctionDefinition = {
  name: 'abs',
  latex: '\\operatorname{abs}',
  arity: 1,
  simplify: ([x]) => {
    if (x.type === 'num') return num(x.value.abs());
    if (isConstantExpr(x)) {
      const sign = numericSign(x);
      if (sign === 1) return x;
      if (sign === -1) return negated(x);
    }
    if (x.type === 'func' && x.name === 'abs') return x;
    // Even powers are never negative: |x²| = x²
    if (x.type === 'pow' && x.exponent.type === 'num' && x.exponent.value.isInteger() && x.exponent.value.numerator % 2n === 0n) {
      return x;
    }
    return hasNegativeSign(x) ? func('abs', negated(x)) : null;
  },
  evaluate: ([x]) => Math.abs(x),
};

