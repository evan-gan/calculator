import { containsVariable } from '../ast/inspect';
import { mul, num, variable, type Expr } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';
import { floatToLatex, rationalToDecimalLatex } from './toDecimal';
import { toLatex } from './toLatex';

// Decimal display of expressions that still contain variables (5x/6 -> 0.833333x).
// Each variable-free piece is swapped for a placeholder "variable" whose name is its
// decimal text, so the normal LaTeX printer handles layout and signs.

function decimalPlaceholder(constant: Expr): Expr {
  if (constant.type === 'num' && constant.value.isInteger()) return constant;
  const value = evaluate(constant);
  const text = constant.type === 'num' ? rationalToDecimalLatex(constant.value.abs()) : floatToLatex(Math.abs(value));
  const placeholder = variable(text);
  // Keep the minus sign outside so sums print "x - 0.5" rather than "x + -0.5".
  return value < 0 ? mul(num(-1), placeholder) : placeholder;
}

function replaceConstants(expr: Expr): Expr {
  if (!containsVariable(expr)) return decimalPlaceholder(expr);
  switch (expr.type) {
    case 'add':
      return { type: 'add', terms: expr.terms.map(replaceConstants) };
    case 'mul': {
      // Merge all constant factors into one number so 3√2·x prints as 4.24264x.
      const constants = expr.factors.filter((factor) => !containsVariable(factor));
      const others = expr.factors.filter((factor) => containsVariable(factor)).map(replaceConstants);
      if (constants.length === 0) return { type: 'mul', factors: others };
      const coefficient = decimalPlaceholder(constants.length === 1 ? constants[0] : mul(...constants));
      // A negative coefficient comes back as -1·value; flatten it so the printer sees the leading -1.
      const coefficientFactors = coefficient.type === 'mul' ? coefficient.factors : [coefficient];
      return { type: 'mul', factors: [...coefficientFactors, ...others] };
    }
    case 'pow': {
      // Keep e as a letter in e^x; 2.71828^x reads worse and isn't more precise.
      const keepsBase = expr.base.type === 'const' && expr.base.name === 'e';
      return { type: 'pow', base: keepsBase ? expr.base : replaceConstants(expr.base), exponent: replaceConstants(expr.exponent) };
    }
    case 'func':
      return { ...expr, args: expr.args.map(replaceConstants) };
    default:
      return expr;
  }
}

export function toDecimalLatexWithVariables(expr: Expr): string {
  return toLatex(replaceConstants(expr));
}
