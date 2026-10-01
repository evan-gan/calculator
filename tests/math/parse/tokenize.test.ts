import { describe, expect, test } from 'vitest';
import { tokenize } from '../../../src/math/parse/tokenize';

const kinds = (latex: string) => tokenize(latex).map((token) => `${token.kind}:${token.value}`);

describe('tokenize', () => {
  test('reads MathQuill brackets, operators and commands', () => {
    expect(kinds('2\\cdot\\left(x+1\\right)')).toEqual([
      'number:2', 'operator:*', 'open:(', 'identifier:x', 'operator:+', 'number:1', 'close:)', 'end:',
    ]);
  });

  test('a bare superscript takes only one digit, as in LaTeX', () => {
    expect(kinds('x^23')).toEqual(['identifier:x', 'operator:^', 'number:2', 'number:3', 'end:']);
  });

  test('subscripts become part of a variable name', () => {
    expect(kinds('x_{12}+y_1')).toEqual(['identifier:x_{12}', 'operator:+', 'identifier:y_{1}', 'end:']);
  });

  test('e is the constant e, \\pi is pi, and greek letters are variables', () => {
    expect(kinds('e\\pi\\theta')).toEqual(['constant:e', 'constant:pi', 'identifier:\\theta', 'end:']);
  });

  test('absolute value delimiters and functions are recognized', () => {
    expect(kinds('\\left|\\sin x\\right|')).toEqual(['absOpen:|', 'function:sin', 'identifier:x', 'absClose:|', 'end:']);
  });

  test('inequalities and unknown commands give clear errors', () => {
    expect(() => tokenize('x<2')).toThrow('Inequalities are not supported');
    expect(() => tokenize('\\int x')).toThrow('isn\'t supported');
  });
});
