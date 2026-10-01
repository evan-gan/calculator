import { describe, expect, test } from 'vitest';
import { derivative, INFINITY, integral, series } from '../../../src/math/ast/calculus';
import { add, mul, negate, num, pow, variable } from '../../../src/math/ast/nodes';
import { parseExpr } from '../../helpers';

const x = variable('x');

describe('parsing derivatives', () => {
  test('d/dx acts on the term after it', () => {
    expect(parseExpr('\\frac{d}{dx}x^{2}+1')).toEqual(add(derivative(pow(x, num(2)), 'x'), num(1)));
  });

  test('parentheses give the derivative a whole sum', () => {
    expect(parseExpr('\\frac{d}{dx}\\left(x+1\\right)')).toEqual(derivative(add(x, num(1)), 'x'));
  });

  test('higher orders are read from d^n/dx^n', () => {
    expect(parseExpr('\\frac{d^{2}}{dx^{2}}x')).toEqual(derivative(x, 'x', 2));
    expect(parseExpr('\\frac{d^3}{dt^3}t')).toEqual(derivative(variable('t'), 't', 3));
  });

  test('other fractions are still fractions', () => {
    expect(parseExpr('\\frac{d}{x}')).toEqual(mul(variable('d'), pow(x, num(-1))));
  });

  test('mismatched orders and missing bodies are explained', () => {
    expect(() => parseExpr('\\frac{d^{2}}{dx}x')).toThrow('matching orders');
    expect(() => parseExpr('\\frac{d}{dx}')).toThrow('needs something to act on');
  });
});

describe('parsing integrals', () => {
  test('the body runs up to the differential', () => {
    expect(parseExpr('\\int x+1dx')).toEqual(integral(add(x, num(1)), 'x'));
  });

  test('limits make it definite, in either order', () => {
    const expected = integral(x, 'x', { lower: num(0), upper: num(1) });
    expect(parseExpr('\\int _0^1x\\,dx')).toEqual(expected);
    expect(parseExpr('\\int ^{1}_{0}x\\,dx')).toEqual(expected);
  });

  test('empty limit boxes (as MathQuill writes them) mean indefinite', () => {
    expect(parseExpr('\\int _{ }^{ }x\\,dx')).toEqual(integral(x, 'x'));
  });

  test('∫ dx integrates 1 and \\mathrm{d} works as the differential', () => {
    expect(parseExpr('\\int dx')).toEqual(integral(num(1), 'x'));
    expect(parseExpr('\\int x\\mathrm{d}x')).toEqual(integral(x, 'x'));
  });

  test('infinite limits', () => {
    expect(parseExpr('\\int _{-\\infty}^{\\infty}x\\,dx')).toEqual(integral(x, 'x', { lower: negate(INFINITY), upper: INFINITY }));
  });

  test('an integral is a factor inside a larger expression', () => {
    expect(parseExpr('2\\int x\\,dx+1')).toEqual(add(mul(num(2), integral(x, 'x')), num(1)));
  });

  test('a missing differential or limit is explained', () => {
    expect(() => parseExpr('\\int x')).toThrow('like ∫ x² dx');
    expect(() => parseExpr('\\int _0x\\,dx')).toThrow('both a lower and an upper limit');
  });
});

describe('parsing sums and products', () => {
  test('Σ reads its index, limits and the term after it', () => {
    const n = variable('n');
    expect(parseExpr('\\sum _{n=1}^{10}n^{2}+1')).toEqual(add(series('sum', pow(n, num(2)), 'n', num(1), num(10)), num(1)));
  });

  test('single-character upper limits and ∞', () => {
    const n = variable('n');
    expect(parseExpr('\\prod _{n=1}^5n')).toEqual(series('product', n, 'n', num(1), num(5)));
    expect(parseExpr('\\sum _{k=0}^{\\infty}k')).toEqual(series('sum', variable('k'), 'k', num(0), INFINITY));
  });

  test('missing parts are explained', () => {
    expect(() => parseExpr('\\sum n')).toThrow('needs a start and an end');
    expect(() => parseExpr('\\sum _{1}^{5}n')).toThrow('like n=1');
    expect(() => parseExpr('\\sum _{n=}^{5}n')).toThrow('empty');
  });

  test('∞ outside a limit is an error', () => {
    expect(() => parseExpr('\\infty+1')).toThrow('only be used as a limit');
    expect(() => parseExpr('\\sum _{n=1}^{\\infty+1}n')).toThrow('stand on its own');
  });
});
