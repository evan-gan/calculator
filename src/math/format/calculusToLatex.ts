import { readDerivative, readIntegral, readSeries } from '../ast/calculus';
import type { Expr, FunctionNode } from '../ast/nodes';
import { toLatex } from './toLatex';

// LaTeX for calculus operators that stay unevaluated (∫_0^1 e^{x²} dx, Σ with a symbolic limit).

/** Sums need brackets so the operator's reach is clear: Σ (n + 1) rather than Σ n + 1. */
function bodyToLatex(body: Expr): string {
  return body.type === 'add' ? `\\left(${toLatex(body)}\\right)` : toLatex(body);
}

function limitsToLatex(lower: string, upper: string): string {
  return `_{${lower}}^{${upper}}`;
}

export function calculusToLatex(call: FunctionNode): string {
  switch (call.name) {
    case 'derivative': {
      const { body, variable, order, point } = readDerivative(call);
      const power = order === 1 ? '' : `^{${order}}`;
      const operator = `\\frac{d${power}}{d${variable}${power}}\\left(${toLatex(body)}\\right)`;
      return point ? `${operator}_{${variable}=${toLatex(point)}}` : operator;
    }
    case 'integral': {
      const { body, variable, bounds } = readIntegral(call);
      const limits = bounds ? limitsToLatex(toLatex(bounds.lower), toLatex(bounds.upper)) : '';
      return `\\int${limits}${bodyToLatex(body)}\\,d${variable}`;
    }
    default: {
      const { body, variable, lower, upper } = readSeries(call);
      const symbol = call.name === 'sum' ? '\\sum' : '\\prod';
      return `${symbol}${limitsToLatex(`${variable}=${toLatex(lower)}`, toLatex(upper))}${bodyToLatex(body)}`;
    }
  }
}
