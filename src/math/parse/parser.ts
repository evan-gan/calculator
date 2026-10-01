import {
  constant,
  divide,
  fraction,
  func,
  mul,
  negate,
  num,
  pow,
  add,
  subtract,
  variable,
  type ConstantName,
  type Expr,
  type FunctionName,
  type Statement,
} from '../ast/nodes';
import { MathError } from '../errors';
import { Rational } from '../number/rational';
import { tokenize, type Token } from './tokenize';

// Pass 2 of parsing: tokens -> expression tree, by recursive descent.
// Precedence (low to high): =, + -, explicit/implicit multiplication, unary minus, ^, ! and %

const INVERSE_TRIG: Partial<Record<string, FunctionName>> = { sin: 'arcsin', cos: 'arccos', tan: 'arctan' };

const CLOSER_FOR: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

class Parser {
  private index = 0;
  // Inside |...| written with bare bars, the next bar closes instead of opening.
  private openBars = 0;

  constructor(private readonly tokens: Token[]) {}

  parseStatement(): Statement {
    const left = this.parseExpression();
    if (!this.isOperator('=')) {
      this.expectEnd();
      return { kind: 'expression', expr: left };
    }
    this.advance();
    const right = this.parseExpression();
    if (this.isOperator('=')) throw new MathError('Only one "=" is allowed per line.');
    this.expectEnd();
    return { kind: 'equation', left, right };
  }

  // ---- token helpers ----

  private peek(): Token {
    return this.tokens[this.index];
  }

  private advance(): Token {
    return this.tokens[this.index++];
  }

  private isOperator(value: string): boolean {
    const token = this.peek();
    return token.kind === 'operator' && token.value === value;
  }

  private expectEnd(): void {
    const token = this.peek();
    if (token.kind === 'end') return;
    if (token.kind === 'close' || token.kind === 'absClose') {
      throw new MathError(`There's an extra closing "${token.value}" with no matching opening bracket.`);
    }
    throw new MathError(`Unexpected "${token.value}".`);
  }

  private expectClose(opener: string): void {
    const token = this.advance();
    const wanted = CLOSER_FOR[opener];
    if (token.kind === 'close' && (token.value === wanted || opener !== '{')) return;
    if (token.kind === 'end') throw new MathError(`Missing a closing "${wanted}".`);
    throw new MathError(`Expected "${wanted}" but found "${token.value}".`);
  }

  private startsOperand(token: Token): boolean {
    switch (token.kind) {
      case 'number':
      case 'identifier':
      case 'constant':
      case 'function':
      case 'frac':
      case 'sqrt':
      case 'open':
      case 'absOpen':
        return true;
      case 'bar':
        return this.openBars === 0;
      default:
        return false;
    }
  }

  // ---- grammar ----

  private parseExpression(): Expr {
    let result = this.parseTerm();
    while (this.isOperator('+') || this.isOperator('-')) {
      const operator = this.advance().value;
      const right = this.parseTerm();
      result = operator === '+' ? add(result, right) : subtract(result, right);
    }
    return result;
  }

  private parseTerm(): Expr {
    const factors: Expr[] = [this.parseUnary()];
    while (true) {
      if (this.isOperator('*')) {
        this.advance();
        factors.push(this.parseUnary());
      } else if (this.isOperator('/')) {
        this.advance();
        factors.push(pow(this.parseUnary(), num(-1)));
      } else if (this.startsOperand(this.peek())) {
        factors.push(this.parsePower());
      } else {
        break;
      }
    }
    return factors.length === 1 ? factors[0] : mul(...factors);
  }

  private parseUnary(): Expr {
    if (this.isOperator('-')) {
      this.advance();
      return negate(this.parseUnary());
    }
    if (this.isOperator('+')) {
      this.advance();
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): Expr {
    const base = this.parsePostfix();
    if (!this.isOperator('^')) return base;
    this.advance();
    return pow(base, this.parseExponent());
  }

  /** Exponents are right-associative: 2^3^2 = 2^(3^2). */
  private parseExponent(): Expr {
    if (this.isOperator('-')) {
      this.advance();
      return negate(this.parseExponent());
    }
    const atom = this.parsePostfix();
    if (!this.isOperator('^')) return atom;
    this.advance();
    return pow(atom, this.parseExponent());
  }

  private parsePostfix(): Expr {
    let result = this.parseAtom();
    while (this.isOperator('!') || this.isOperator('%')) {
      const operator = this.advance().value;
      // 50% means 50/100
      result = operator === '!' ? func('factorial', result) : mul(result, fraction(1, 100));
    }
    return result;
  }

  private parseAtom(): Expr {
    const token = this.advance();
    switch (token.kind) {
      case 'number':
        return num(Rational.parse(token.value));
      case 'identifier':
        return variable(token.value);
      case 'constant':
        return constant(token.value as ConstantName);
      case 'open':
        return this.parseGroup(token.value);
      case 'frac':
        return this.parseFraction();
      case 'sqrt':
        return this.parseRoot();
      case 'absOpen':
        return this.parseAbsolute('absClose');
      case 'bar':
        return this.parseAbsolute('bar');
      case 'function':
        return this.parseFunction(token.value);
      case 'end':
        throw new MathError('The expression ends too early. Something is missing at the end.');
      default:
        throw new MathError(`Unexpected "${token.value}". Check for a missing number or variable before it.`);
    }
  }

  private parseGroup(opener: string): Expr {
    const closer = this.peek();
    if (closer.kind === 'close') {
      throw new MathError(opener === '{' ? 'There is an empty box. Fill it in or delete it.' : 'Empty parentheses. Put something inside them.');
    }
    const inner = this.parseExpression();
    this.expectClose(opener);
    return inner;
  }

  /** A braced group, or a single character (LaTeX allows \frac12). */
  private parseRequiredArgument(what: string): Expr {
    const token = this.peek();
    if (token.kind === 'open' && token.value === '{') {
      this.advance();
      return this.parseGroup('{');
    }
    if (token.kind === 'end') throw new MathError(`The ${what} is missing.`);
    return this.parseAtom();
  }

  private parseFraction(): Expr {
    const numerator = this.parseRequiredArgument('fraction numerator');
    const denominator = this.parseRequiredArgument('fraction denominator');
    return divide(numerator, denominator);
  }

  private parseRoot(): Expr {
    let index: Expr = num(2);
    const token = this.peek();
    if (token.kind === 'open' && token.value === '[') {
      this.advance();
      index = this.parseGroup('[');
    }
    const radicand = this.parseRequiredArgument('square root contents');
    return pow(radicand, pow(index, num(-1)));
  }

  private parseAbsolute(closingKind: 'absClose' | 'bar'): Expr {
    if (closingKind === 'bar') this.openBars++;
    const inner = this.parseExpression();
    const token = this.advance();
    if (closingKind === 'bar') this.openBars--;
    if (token.kind !== closingKind) throw new MathError('An absolute value bar | is missing its closing bar.');
    return func('abs', inner);
  }

  private parseFunction(name: string): Expr {
    // MathQuill writes \sin^{2}x for (sin x)^2 and \sin^{-1}x for arcsin x.
    let power: Expr | null = null;
    if (this.isOperator('^')) {
      this.advance();
      power = this.parseExponent();
    }
    let logBase: Expr = num(10);
    if (name === 'log' && this.isOperator('_')) {
      this.advance();
      logBase = this.parseRequiredArgument('logarithm base');
    }
    const argument = this.parseFunctionArgument(name);

    if (name === 'exp') return pow(constant('e'), argument);
    const inverseName = INVERSE_TRIG[name];
    if (power && inverseName && isMinusOne(power)) return func(inverseName, argument);
    const call = name === 'log' ? func('log', argument, logBase) : func(name as FunctionName, argument);
    return power ? pow(call, power) : call;
  }

  /**
   * sin(x) uses the parentheses; sin 2x takes the following implicit product (2x),
   * stopping at + - = or another function, so sin x cos x = sin(x)·cos(x).
   */
  private parseFunctionArgument(name: string): Expr {
    const token = this.peek();
    if (token.kind === 'open' && token.value !== '{') {
      this.advance();
      return this.parseGroup(token.value);
    }
    if (!this.startsOperand(token)) throw new MathError(`${name} needs an input, like ${name}(x).`);
    const factors: Expr[] = [this.parsePower()];
    while (this.startsOperand(this.peek()) && this.peek().kind !== 'function') factors.push(this.parsePower());
    return factors.length === 1 ? factors[0] : mul(...factors);
  }
}

/** Matches the raw tree the parser builds for "-1": mul(-1, 1). */
function isMinusOne(expr: Expr): boolean {
  if (expr.type === 'num') return expr.value.equals(Rational.MINUS_ONE);
  if (expr.type !== 'mul' || expr.factors.length !== 2) return false;
  const [sign, magnitude] = expr.factors;
  return sign.type === 'num' && sign.value.equals(Rational.MINUS_ONE) && magnitude.type === 'num' && magnitude.value.isOne();
}

/** Parse one line of MathQuill LaTeX into an expression or an equation. */
export function parseLatex(latex: string): Statement {
  return new Parser(tokenize(latex)).parseStatement();
}
