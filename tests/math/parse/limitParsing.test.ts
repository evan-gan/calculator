import { describe, expect, test } from 'vitest';
import { INFINITY, limit, series } from '../../../src/math/ast/calculus';
import { add, divide, func, mul, negate, num, pow, variable } from '../../../src/math/ast/nodes';
import { parseExpr } from '../../helpers';

const x = variable('x');

describe('parsing lim', () => {
  test('lim_{x→a} acts on the term after it', () => {
    expect(parseExpr('\\lim_{x\\to0}\\frac{\\sin x}{x}')).toEqual(limit(divide(func('sin', x), x), 'x', num(0)));
    expect(parseExpr('\\lim_{x\\to2}x^{2}+1')).toEqual(add(limit(pow(x, num(2)), 'x', num(2)), num(1)));
  });

  test('\\to, \\rightarrow and the → character all work as the arrow', () => {
    const expected = limit(x, 'x', num(1));
    expect(parseExpr('\\lim_{x\\rightarrow 1}x')).toEqual(expected);
    expect(parseExpr('\\lim_{x→1}x')).toEqual(expected);
  });

  test('one-sided limits: 0^{+}, 0^- and 0+', () => {
    expect(parseExpr('\\lim_{x\\to0^{+}}x')).toEqual(limit(x, 'x', num(0), 1));
    expect(parseExpr('\\lim_{x\\to0^-}x')).toEqual(limit(x, 'x', num(0), -1));
    expect(parseExpr('\\lim_{x\\to0+}x')).toEqual(limit(x, 'x', num(0), 1));
  });

  test('limits at ±∞', () => {
    expect(parseExpr('\\lim_{x\\to\\infty}x')).toEqual(limit(x, 'x', INFINITY));
    expect(parseExpr('\\lim_{x\\to-\\infty}x')).toEqual(limit(x, 'x', negate(INFINITY)));
  });

  test("a fraction typed after lim (MathQuill puts lim on top) is moved inside when it uses the limit's variable", () => {
    expect(parseExpr('\\frac{\\lim_{x\\to0}\\sin x}{x}')).toEqual(limit(divide(func('sin', x), x), 'x', num(0)));
    const n = variable('n');
    expect(parseExpr('\\frac{\\sum_{n=1}^{3}n}{n}')).toEqual(series('sum', divide(n, n), 'n', num(1), num(3)));
    // A bottom without the variable stays outside.
    expect(parseExpr('\\frac{\\lim_{x\\to0}x}{2}')).toEqual(mul(limit(x, 'x', num(0)), pow(num(2), num(-1))));
  });

  test('malformed limits are explained', () => {
    expect(() => parseExpr('\\lim x')).toThrow('needs a subscript');
    expect(() => parseExpr('\\lim_{x}x')).toThrow('a variable, an arrow and a point');
    expect(() => parseExpr('\\lim_{x\\to0}')).toThrow('needs something to act on');
    expect(() => parseExpr('\\lim_{x\\to\\infty^{+}}x')).toThrow('∞ has to stand on its own');
  });
});
