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
import { derivative, INFINITY, infinityDirection, integral, limit, series, type LimitSide, type SeriesName } from '../ast/calculus';
import { containsVariable } from '../ast/inspect';
import { MathError } from '../errors';
import { Rational } from '../number/rational';
import { tokenize, type Token } from './tokenize';

// Pass 2 of parsing: tokens -> expression tree, by recursive descent.
// Precedence (low to high): =, + -, explicit/implicit multiplication, unary minus, ^, ! and %
// d/dx, Σ, Π and lim act on the term that follows them (d/dx x² + 1 = 2x + 1);
// an integral's body runs up to its differential (∫ x + 1 dx).

const INVERSE_TRIG: Partial<Record<string, FunctionName>> = { sin: 'arcsin', cos: 'arccos', tan: 'arctan' };

const CLOSER_FOR: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

class Parser {
  private index = 0;
  // Inside |...| written with bare bars, the next bar closes instead of opening.
  private openBars = 0;
  // Inside an integral body, "d x" is the differential that ends the body, not d·x.
  private integralDepth = 0;

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

  private tokenAt(offset: number): Token {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  private isDifferentialAhead(): boolean {
    const first = this.tokenAt(0);
    return this.integralDepth > 0 && first.kind === 'identifier' && first.value === 'd' && this.tokenAt(1).kind === 'identifier';
  }

  private startsOperand(token: Token): boolean {
    if (token === this.peek() && this.isDifferentialAhead()) return false;
    switch (token.kind) {
      case 'number':
      case 'identifier':
      case 'constant':
      case 'function':
      case 'frac':
      case 'sqrt':
      case 'open':
      case 'absOpen':
      case 'bigOperator':
      case 'infinity':
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
        return this.parseFractionOrDerivative();
      case 'sqrt':
        return this.parseRoot();
      case 'absOpen':
        return this.parseAbsolute('absClose');
      case 'bar':
        return this.parseAbsolute('bar');
      case 'function':
        return this.parseFunction(token.value);
      case 'bigOperator':
        if (token.value === 'integral') return this.parseIntegral();
        if (token.value === 'limit') return this.parseLimit();
        return this.parseSeries(token.value as SeriesName);
      case 'infinity':
        throw new MathError('∞ can only be used as a limit of a sum, an integral or lim.');
      case 'side':
        throw new MathError(`A + or - after a number only means something in a one-sided limit, like lim_{x→0⁺}.`);
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
    return divideIntoOperator(numerator, denominator) ?? divide(numerator, denominator);
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

  // ---- calculus ----

  /** \frac{d}{dx} (or \frac{d^{2}}{dx^{2}}) is a derivative operator; any other \frac is a fraction. */
  private parseFractionOrDerivative(): Expr {
    const operator = matchDerivativeOperator(this.tokens, this.index);
    if (!operator) return this.parseFraction();
    this.index = operator.end;
    const body = this.parseOperatorBody(`d/d${operator.variable}`, `d/d${operator.variable}(${operator.variable}^2)`);
    return derivative(body, operator.variable, operator.order);
  }

  /** The term an operator acts on: d/dx x² sin x, or Σ (n+1). */
  private parseOperatorBody(operatorName: string, example: string): Expr {
    if (!this.startsOperand(this.peek()) && !this.isOperator('-')) {
      throw new MathError(`${operatorName} needs something to act on, like ${example}.`);
    }
    return this.parseTerm();
  }

  private parseIntegral(): Expr {
    const limits = this.parseLimits('integral');
    this.integralDepth++;
    // ∫ dx on its own integrates 1.
    const body = this.isDifferentialAhead() ? num(1) : this.parseExpression();
    this.integralDepth--;
    const variableName = this.parseDifferential();
    const { lower, upper } = limits;
    if (!lower !== !upper) throw new MathError('A definite integral needs both a lower and an upper limit.');
    return integral(body, variableName, lower && upper ? { lower, upper } : null);
  }

  private parseDifferential(): string {
    const [d, variableToken] = [this.tokenAt(0), this.tokenAt(1)];
    if (d.kind !== 'identifier' || d.value !== 'd' || variableToken.kind !== 'identifier') {
      throw new MathError('An integral must end with the variable it integrates over, like ∫ x² dx.');
    }
    this.index += 2;
    return variableToken.value;
  }

  private parseSeries(name: SeriesName): Expr {
    const symbol = name === 'sum' ? 'Σ' : 'Π';
    const { lower, upper, indexName } = this.parseLimits(name);
    if (!lower || !upper || !indexName) {
      throw new MathError(`${symbol} needs a start and an end, like ${symbol} from n=1 to 10.`);
    }
    const body = this.parseOperatorBody(symbol, `${symbol}_{n=1}^{10} n`);
    return series(name, body, indexName, lower, upper);
  }

  /** lim_{x→a} acting on the term after it; a may be ±∞, and a⁺ / a⁻ make it one-sided. */
  private parseLimit(): Expr {
    if (!this.isOperator('_')) throw new MathError('lim needs a subscript saying where the variable goes, like lim_{x→0}.');
    this.advance();
    this.expectOpenBrace('Write where the limit goes in braces after lim, like lim_{x→0}.');
    const name = this.advance();
    if (name.kind !== 'identifier' || !this.isOperator('→')) {
      throw new MathError('Write the limit as a variable, an arrow and a point, like lim_{x→0}.');
    }
    this.advance();
    const point = this.parseLimitValue();
    let side: LimitSide = 0;
    if (this.peek().kind === 'side') side = this.advance().value === '+' ? 1 : -1;
    this.expectClose('{');
    if (side !== 0 && infinityDirection(point) !== 0) throw new MathError('A limit at ∞ is already one-sided; leave out the + or -.');
    const body = this.parseOperatorBody('lim', `lim_{${name.value}→0} sin(${name.value})/${name.value}`);
    return limit(body, name.value, point, side);
  }

  /** _{lower} and ^{upper} in either order; a sum's lower limit is written n=1. Empty boxes give null. */
  private parseLimits(operator: string): { lower: Expr | null; upper: Expr | null; indexName: string | null } {
    const limits: { lower: Expr | null; upper: Expr | null; indexName: string | null } = { lower: null, upper: null, indexName: null };
    while (this.isOperator('_') || this.isOperator('^')) {
      const isLower = this.advance().value === '_';
      if (isLower && operator !== 'integral') {
        this.expectOpenBrace(`Write where the ${operator} starts like n=1.`);
        limits.indexName = this.parseIndexName(operator);
        limits.lower = this.parseLimitValue();
        this.expectClose('{');
      } else if (isLower) {
        limits.lower = this.parseLimitArgument();
      } else {
        limits.upper = this.parseLimitArgument();
      }
    }
    return limits;
  }

  private expectOpenBrace(message: string): void {
    const token = this.advance();
    if (token.kind !== 'open' || token.value !== '{') throw new MathError(message);
  }

  private parseIndexName(operator: string): string {
    const name = this.advance();
    const equals = this.advance();
    if (name.kind !== 'identifier' || equals.kind !== 'operator' || equals.value !== '=') {
      throw new MathError(`Write where the ${operator} starts with a variable, like n=1.`);
    }
    return name.value;
  }

  /** A limit after _ or ^: a braced group (possibly empty) or a single character. */
  private parseLimitArgument(): Expr | null {
    const token = this.peek();
    if (token.kind === 'infinity') {
      this.advance();
      return INFINITY;
    }
    if (token.kind !== 'open' || token.value !== '{') return this.parseAtom();
    this.advance();
    if (this.peek().kind === 'close') {
      this.advance();
      return null;
    }
    const value = this.parseLimitValue();
    this.expectClose('{');
    return value;
  }

  /** An ordinary expression, or ∞ / -∞ / +∞ standing on its own. */
  private parseLimitValue(): Expr {
    if (this.peek().kind === 'close') throw new MathError('A limit box is empty. Fill it in.');
    const isSigned = (this.isOperator('-') || this.isOperator('+')) && this.tokenAt(1).kind === 'infinity';
    if (this.peek().kind !== 'infinity' && !isSigned) return this.parseExpression();
    const isNegative = isSigned && this.isOperator('-');
    this.index += isSigned ? 2 : 1;
    if (this.peek().kind !== 'close') throw new MathError('∞ has to stand on its own as a limit, like ∞ or -∞.');
    return isNegative ? negate(INFINITY) : INFINITY;
  }
}

/**
 * Typing "/" after lim_{x→0} sin x makes MathQuill put the whole operator on top: \frac{\lim_{x\to0}\sin x}{x}.
 * When the bottom uses the operator's own variable (here x, which means nothing outside the limit),
 * the division belongs inside: lim_{x→0} (sin x / x). The same goes for Σ and Π.
 */
function divideIntoOperator(numerator: Expr, denominator: Expr): Expr | null {
  if (numerator.type !== 'func' || !['limit', 'sum', 'product'].includes(numerator.name)) return null;
  const [body, marker, ...rest] = numerator.args;
  if (marker.type !== 'var' || !containsVariable(denominator, marker.name)) return null;
  return { ...numerator, args: [divide(body, denominator), marker, ...rest] };
}

/** Matches the raw tree the parser builds for "-1": mul(-1, 1). */
function isMinusOne(expr: Expr): boolean {
  if (expr.type === 'num') return expr.value.equals(Rational.MINUS_ONE);
  if (expr.type !== 'mul' || expr.factors.length !== 2) return false;
  const [sign, magnitude] = expr.factors;
  return sign.type === 'num' && sign.value.equals(Rational.MINUS_ONE) && magnitude.type === 'num' && magnitude.value.isOne();
}

/** Reads an optional ^2 or ^{2} after a d. Returns the order and where reading stopped. */
function readOrder(tokens: Token[], start: number): { order: number; end: number } {
  if (tokens[start]?.kind !== 'operator' || tokens[start].value !== '^') return { order: 1, end: start };
  const braced = tokens[start + 1]?.kind === 'open' && tokens[start + 1].value === '{';
  const digits = tokens[braced ? start + 2 : start + 1];
  if (digits?.kind !== 'number' || !/^\d+$/.test(digits.value)) return { order: 0, end: start };
  if (braced && tokens[start + 3]?.kind !== 'close') return { order: 0, end: start };
  return { order: Number(digits.value), end: start + (braced ? 4 : 2) };
}

const isToken = (token: Token | undefined, kind: Token['kind'], value?: string) =>
  token !== undefined && token.kind === kind && (value === undefined || token.value === value);

// Higher orders than this are almost certainly typos and would only make huge expressions.
const MAX_DERIVATIVE_ORDER = 20;

/**
 * Match the tokens of {d}{dx} or {d^2}{dx^2} right after \frac.
 * Returns the variable, order and index just past the operator, or null for an ordinary fraction.
 */
function matchDerivativeOperator(tokens: Token[], start: number): { variable: string; order: number; end: number } | null {
  if (!isToken(tokens[start], 'open', '{') || !isToken(tokens[start + 1], 'identifier', 'd')) return null;
  const top = readOrder(tokens, start + 2);
  if (!isToken(tokens[top.end], 'close')) return null;
  const bottomStart = top.end + 1;
  if (!isToken(tokens[bottomStart], 'open', '{') || !isToken(tokens[bottomStart + 1], 'identifier', 'd')) return null;
  const variableToken = tokens[bottomStart + 2];
  if (!isToken(variableToken, 'identifier')) return null;
  const bottom = readOrder(tokens, bottomStart + 3);
  if (!isToken(tokens[bottom.end], 'close')) return null;
  if (top.order !== bottom.order || top.order < 1) {
    throw new MathError('A derivative needs matching orders on top and bottom, like d²/dx².');
  }
  if (top.order > MAX_DERIVATIVE_ORDER) throw new MathError(`Derivatives above order ${MAX_DERIVATIVE_ORDER} aren't supported.`);
  return { variable: variableToken.value, order: top.order, end: bottom.end + 1 };
}

/** Parse one line of MathQuill LaTeX into an expression or an equation. */
export function parseLatex(latex: string): Statement {
  return new Parser(tokenize(latex)).parseStatement();
}
