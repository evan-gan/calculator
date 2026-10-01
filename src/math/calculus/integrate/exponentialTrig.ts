import { containsVariable } from '../../ast/inspect';
import { add, divide, func, mul, num, type Expr } from '../../ast/nodes';
import { productOf, sumOf } from '../../operations/arithmetic';
import { linearParts } from './linear';
import type { IntegrationMethod } from './types';

// ∫ b^(αx + c)·sin(βx + d) dx and the cosine version. Integrating by parts twice brings the
// integral back, so it is solved for directly. With a = α·ln b (the exponent's real growth rate):
//   ∫ e^(ax)·sin(βx) dx = e^(ax)·(a·sin(βx) - β·cos(βx))/(a² + β²)
//   ∫ e^(ax)·cos(βx) dx = e^(ax)·(a·cos(βx) + β·sin(βx))/(a² + β²)

type Exponential = { power: Expr; rate: Expr };
type Wave = { name: 'sin' | 'cos'; argument: Expr; rate: Expr };

function readExponential(factor: Expr, variable: string): Exponential | null {
  if (factor.type !== 'pow' || containsVariable(factor.base, variable)) return null;
  const linear = linearParts(factor.exponent, variable);
  if (!linear) return null;
  const isEuler = factor.base.type === 'const' && factor.base.name === 'e';
  return { power: factor, rate: isEuler ? linear.slope : productOf(linear.slope, func('ln', factor.base)) };
}

function readWave(factor: Expr, variable: string): Wave | null {
  if (factor.type !== 'func' || (factor.name !== 'sin' && factor.name !== 'cos')) return null;
  const linear = linearParts(factor.args[0], variable);
  return linear && { name: factor.name, argument: factor.args[0], rate: linear.slope };
}

export const exponentialTrigMethod: IntegrationMethod = (expr, variable) => {
  if (expr.type !== 'mul' || expr.factors.length !== 2) return null;
  const [first, second] = expr.factors;
  const exponential = readExponential(first, variable) ?? readExponential(second, variable);
  const wave = readWave(first, variable) ?? readWave(second, variable);
  if (!exponential || !wave) return null;
  const { rate: a, power } = exponential;
  const { rate: beta, argument } = wave;
  const [sine, cosine] = [func('sin', argument), func('cos', argument)];
  const combination = wave.name === 'sin' ? add(mul(a, sine), mul(num(-1), beta, cosine)) : add(mul(a, cosine), mul(beta, sine));
  return divide(mul(power, combination), sumOf(productOf(a, a), productOf(beta, beta)));
};
