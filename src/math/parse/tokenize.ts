import { MathError } from '../errors';

// Pass 1 of parsing: LaTeX text (as produced by MathQuill) -> flat token list.

export type TokenKind =
  | 'number'
  | 'identifier' // variable name, e.g. x, x_{1}, \theta
  | 'constant' // pi or e
  | 'function' // sin, ln, log, ...
  | 'frac'
  | 'sqrt'
  | 'operator' // + - * / ^ _ = ! , %
  | 'open' // ( [ {   (value holds which)
  | 'close' // ) ] }
  | 'absOpen'
  | 'absClose'
  | 'bar' // a bare | whose role (open/close) the parser decides
  | 'end';

export type Token = { kind: TokenKind; value: string };

const FUNCTION_COMMANDS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'ln', 'log', 'exp',
]);

const GREEK_LETTERS = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda',
  'mu', 'nu', 'xi', 'rho', 'sigma', 'tau', 'upsilon', 'phi', 'chi', 'psi', 'omega', 'varphi', 'vartheta',
]);

const SPACING_COMMANDS = new Set([' ', ',', ':', ';', '!']);

const UNICODE_OPERATORS: Record<string, string> = { '·': '*', '×': '*', '÷': '/', '−': '-' };

// \operatorname{...} names that map onto built-in functions.
const OPERATOR_NAME_ALIASES: Record<string, string> = { abs: 'abs', arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan' };

class Tokenizer {
  private position = 0;
  private readonly tokens: Token[] = [];

  constructor(private readonly source: string) {}

  run(): Token[] {
    while (this.position < this.source.length) this.readNext();
    this.tokens.push({ kind: 'end', value: '' });
    return this.tokens;
  }

  private peekChar(offset = 0): string {
    return this.source[this.position + offset] ?? '';
  }

  private push(kind: TokenKind, value: string): void {
    this.tokens.push({ kind, value });
  }

  private previousIsScriptOperator(): boolean {
    const previous = this.tokens[this.tokens.length - 1];
    return previous?.kind === 'operator' && (previous.value === '^' || previous.value === '_');
  }

  private readNext(): void {
    const char = this.peekChar();
    if (/\s/.test(char)) {
      this.position++;
    } else if (char === '\\') {
      this.readCommand();
    } else if (/[0-9.]/.test(char)) {
      this.readNumber();
    } else if (/[a-zA-Z]/.test(char)) {
      this.position++;
      if (char === 'e') this.push('constant', 'e');
      else this.pushIdentifier(char);
    } else {
      this.position++;
      this.readSymbol(char);
    }
  }

  private readSymbol(char: string): void {
    if ('+-*/^_=!,%'.includes(char)) return this.push('operator', char);
    if (UNICODE_OPERATORS[char]) return this.push('operator', UNICODE_OPERATORS[char]);
    if ('([{'.includes(char)) return this.push('open', char);
    if (')]}'.includes(char)) return this.push('close', char);
    if (char === '|') return this.push('bar', '|');
    if (char === '<' || char === '>') throw new MathError('Inequalities are not supported yet. Use = to solve an equation.');
    throw new MathError(`The character "${char}" isn't something this calculator understands.`);
  }

  private readNumber(): void {
    // In LaTeX, x^23 means x^{2}·3, so a bare superscript only takes one digit.
    if (this.previousIsScriptOperator()) {
      this.push('number', this.peekChar());
      this.position++;
      return;
    }
    const match = this.source.slice(this.position).match(/^\d*\.?\d*/);
    const text = match ? match[0] : '';
    if (text === '.' || text === '') throw new MathError('A decimal point needs digits next to it, like 0.5.');
    this.position += text.length;
    this.push('number', text);
  }

  /** Letters become variables; a following subscript (x_1, x_{12}) becomes part of the name. */
  private pushIdentifier(name: string): void {
    if (this.peekChar() === '_' && !this.previousIsScriptOperator()) {
      this.position++;
      name += `_{${this.readScriptText()}}`;
    }
    this.push('identifier', name);
  }

  private readScriptText(): string {
    if (this.peekChar() === '{') {
      const closing = this.source.indexOf('}', this.position);
      if (closing < 0) throw new MathError('A subscript is missing its closing brace.');
      const text = this.source.slice(this.position + 1, closing).trim();
      this.position = closing + 1;
      if (!text) throw new MathError('A subscript is empty. Fill it in or delete it.');
      return text;
    }
    const char = this.peekChar();
    if (!char) throw new MathError('A subscript is empty. Fill it in or delete it.');
    this.position++;
    return char;
  }

  private readBracedWord(command: string): string {
    const match = this.source.slice(this.position).match(/^\{([^}]*)\}/);
    if (!match) throw new MathError(`\\${command} must be followed by a name in braces.`);
    this.position += match[0].length;
    return match[1].trim();
  }

  private readCommand(): void {
    this.position++; // skip the backslash
    const next = this.peekChar();
    if (SPACING_COMMANDS.has(next)) {
      this.position++;
      return;
    }
    if (next === '%') {
      this.position++;
      this.push('operator', '%');
      return;
    }
    if (next === '{' || next === '}') {
      this.position++;
      this.push(next === '{' ? 'open' : 'close', next === '{' ? '(' : ')');
      return;
    }
    const name = this.source.slice(this.position).match(/^[a-zA-Z]+/)?.[0];
    if (!name) throw new MathError(`Unknown command "\\${next}".`);
    this.position += name.length;
    this.handleNamedCommand(name);
  }

  private handleNamedCommand(name: string): void {
    if (name === 'left' || name === 'right') return this.readDelimiter(name);
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') return this.push('frac', 'frac');
    if (name === 'sqrt') return this.push('sqrt', 'sqrt');
    if (name === 'cdot' || name === 'times' || name === 'ast') return this.push('operator', '*');
    if (name === 'div') return this.push('operator', '/');
    if (name === 'pi') return this.push('constant', 'pi');
    if (FUNCTION_COMMANDS.has(name)) return this.push('function', name);
    if (GREEK_LETTERS.has(name)) return this.pushIdentifier(`\\${name}`);
    if (name === 'operatorname') return this.readOperatorName();
    if (name === 'mathrm' || name === 'text') return this.readTextConstant(name);
    if (['le', 'ge', 'leq', 'geq', 'lt', 'gt', 'ne', 'neq'].includes(name)) {
      throw new MathError('Inequalities are not supported yet. Use = to solve an equation.');
    }
    throw new MathError(`"\\${name}" isn't supported yet.`);
  }

  private readOperatorName(): void {
    const word = this.readBracedWord('operatorname');
    const alias = OPERATOR_NAME_ALIASES[word];
    if (!alias) throw new MathError(`The function "${word}" isn't supported yet.`);
    this.push('function', alias);
  }

  private readTextConstant(command: string): void {
    const word = this.readBracedWord(command);
    if (word === 'e') return this.push('constant', 'e');
    throw new MathError(`"${word}" isn't something this calculator understands.`);
  }

  /** \left( \right) \left| \right| \left[ ... -> open/close tokens. */
  private readDelimiter(side: 'left' | 'right'): void {
    while (/\s/.test(this.peekChar())) this.position++;
    let delimiter = this.peekChar();
    this.position++;
    if (delimiter === '\\') {
      // \left\{  or  \left\lbrace etc.
      const word = this.source.slice(this.position).match(/^([a-zA-Z]+|[{}|])/)?.[0] ?? '';
      this.position += word.length;
      delimiter = word === '{' || word === 'lbrace' ? '(' : word === '}' || word === 'rbrace' ? ')' : word === '|' ? '|' : word;
    }
    if (delimiter === '.') return; // invisible delimiter
    if (delimiter === '|') return this.push(side === 'left' ? 'absOpen' : 'absClose', '|');
    if (side === 'left' && '(['.includes(delimiter)) return this.push('open', delimiter);
    if (side === 'right' && ')]'.includes(delimiter)) return this.push('close', delimiter);
    throw new MathError(`Unsupported bracket "${delimiter}".`);
  }
}

export function tokenize(latex: string): Token[] {
  return new Tokenizer(latex).run();
}
