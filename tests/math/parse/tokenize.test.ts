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
    expect(() => tokenize('\\liminf x')).toThrow('isn\'t supported');
  });

  test('integrals, sums, products and infinity get their own tokens', () => {
    expect(tokenize('\\int _0^1').slice(0, 1)).toEqual([{ kind: 'bigOperator', value: 'integral' }]);
    expect(tokenize('\\sum \\prod \\infty').slice(0, 3)).toEqual([
      { kind: 'bigOperator', value: 'sum' },
      { kind: 'bigOperator', value: 'product' },
      { kind: 'infinity', value: 'infinity' },
    ]);
    expect(tokenize('\\mathrm{d}x').slice(0, 2)).toEqual([
      { kind: 'identifier', value: 'd' },
      { kind: 'identifier', value: 'x' },
    ]);
  });

  test('lim, arrows and one-sided markers', () => {
    expect(tokenize('\\lim_{x\\to 0}').slice(0, 6)).toEqual([
      { kind: 'bigOperator', value: 'limit' },
      { kind: 'operator', value: '_' },
      { kind: 'open', value: '{' },
      { kind: 'identifier', value: 'x' },
      { kind: 'operator', value: '→' },
      { kind: 'number', value: '0' },
    ]);
    expect(tokenize('\\rightarrow →').slice(0, 2)).toEqual([
      { kind: 'operator', value: '→' },
      { kind: 'operator', value: '→' },
    ]);
  });

  test('a sign just before a closing brace becomes a side marker: 0^{+}, 0^-, 0+', () => {
    for (const latex of ['{x\\to 0^{+}}', '{x\\to 0^+}', '{x\\to 0+}']) {
      expect(tokenize(latex).slice(3, 6)).toEqual([
        { kind: 'number', value: '0' },
        { kind: 'side', value: '+' },
        { kind: 'close', value: '}' },
      ]);
    }
    expect(tokenize('{x\\to 0^{-}}')[4]).toEqual({ kind: 'side', value: '-' });
  });
});
