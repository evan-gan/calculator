import { integral, isCalculusOperator, readIntegral, readSeries, series, type SeriesName } from '../ast/calculus';
import { containsVariable, substituteVariable } from '../ast/inspect';
import { add, func, mul, num, pow, type Expr, type FunctionNode, type PowerNode } from '../ast/nodes';
import { MathError } from '../errors';
import { getFunction } from '../operations/functions/registry';
import { simplify } from '../simplify/simplify';

// Symbolic differentiation. Rules return unsimplified trees; derivativeOf simplifies the result.

/** d/dx of an expression, simplified. */
export function derivativeOf(expr: Expr, variable: string): Expr {
  return simplify(differentiate(expr, variable));
}

/** d/dx of an expression as a raw tree (sum, product, power and chain rules). */
export function differentiate(expr: Expr, variable: string): Expr {
  if (!containsVariable(expr, variable)) return num(0);
  switch (expr.type) {
    case 'var':
      return num(1);
    case 'add':
      return add(...expr.terms.map((term) => differentiate(term, variable)));
    case 'mul':
      return differentiateProduct(expr.factors, variable);
    case 'pow':
      return differentiatePower(expr, variable);
    case 'func':
      return differentiateCall(expr, variable);
    default:
      return num(0);
  }
}

/** (fgh)' = f'gh + fg'h + fgh', skipping factors that don't depend on the variable. */
function differentiateProduct(factors: Expr[], variable: string): Expr {
  const terms = factors.flatMap((factor, index) => {
    if (!containsVariable(factor, variable)) return [];
    const others = factors.filter((_, otherIndex) => otherIndex !== index);
    return [mul(...others, differentiate(factor, variable))];
  });
  return add(...terms);
}

function differentiatePower({ base, exponent }: PowerNode, variable: string): Expr {
  const baseRate = differentiate(base, variable);
  if (!containsVariable(exponent, variable)) {
    // Power rule: (u^n)' = n·u^(n-1)·u'
    return mul(exponent, pow(base, add(exponent, num(-1))), baseRate);
  }
  const exponentRate = differentiate(exponent, variable);
  if (!containsVariable(base, variable)) {
    // (b^v)' = b^v · ln b · v'
    return mul(pow(base, exponent), func('ln', base), exponentRate);
  }
  // (u^v)' = u^v · (v' ln u + v u'/u)
  const logarithmicRate = add(mul(exponentRate, func('ln', base)), mul(exponent, baseRate, pow(base, num(-1))));
  return mul(pow(base, exponent), logarithmicRate);
}

function differentiateCall(call: FunctionNode, variable: string): Expr {
  if (isCalculusOperator(call.name)) return differentiateOperator(call, variable);
  const definition = getFunction(call.name);
  return definition.derivative(
    call.args,
    call.args.map((arg) => differentiate(arg, variable)),
  );
}

/** Operators that are still unevaluated (an integral with no closed form, a symbolic sum). */
function differentiateOperator(call: FunctionNode, variable: string): Expr {
  if (call.name === 'integral') return differentiateIntegral(call, variable);
  if (call.name === 'sum') return differentiateSum(call, variable);
  const what = call.name === 'product' ? 'product (Π)' : call.name === 'limit' ? 'limit' : 'expression';
  throw new MathError(`Can't differentiate this ${what} yet.`, 'unsupported');
}

/**
 * d/dx ∫ f dx = f (fundamental theorem). For a definite integral, the Leibniz rule:
 * f(upper)·upper' − f(lower)·lower' + ∫ ∂f/∂x.
 */
function differentiateIntegral(call: FunctionNode, variable: string): Expr {
  const { body, variable: integrationVariable, bounds } = readIntegral(call);
  if (!bounds) {
    if (integrationVariable === variable) return body;
    return integral(differentiate(body, variable), integrationVariable);
  }
  const valueAt = (point: Expr) => substituteVariable(body, integrationVariable, point);
  const boundaryTerms = add(
    mul(valueAt(bounds.upper), differentiate(bounds.upper, variable)),
    mul(num(-1), valueAt(bounds.lower), differentiate(bounds.lower, variable)),
  );
  // In ∫_0^x x² dx the inner x is the local integration variable, so only the limits count.
  if (integrationVariable === variable || !containsVariable(body, variable)) return boundaryTerms;
  return add(boundaryTerms, integral(differentiate(body, variable), integrationVariable, bounds));
}

/** d/dx Σ f = Σ df/dx, when the limits don't depend on x. */
function differentiateSum(call: FunctionNode, variable: string): Expr {
  const { body, variable: index, lower, upper } = readSeries(call);
  if (containsVariable(lower, variable) || containsVariable(upper, variable)) {
    throw new MathError("Can't differentiate a sum whose limits depend on the variable.", 'unsupported');
  }
  return series(call.name as SeriesName, differentiate(body, variable), index, lower, upper);
}
