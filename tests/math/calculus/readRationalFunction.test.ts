import { describe, expect, test } from 'vitest';
import { toRationalFunction } from '../../../src/math/calculus/readRationalFunction';
import { simplify } from '../../../src/math/simplify/simplify';
import { parseExpr } from '../../helpers';

function partsOf(latex: string) {
  const result = toRationalFunction(simplify(parseExpr(latex)), 'n');
  return result && { numerator: result.numerator.map(String), denominator: result.denominator.map(String) };
}

describe('reading expressions as N(n)/D(n)', () => {
  test('a product with a negative power: 1/(n(n+1))', () => {
    expect(partsOf('\\frac{1}{n\\left(n+1\\right)}')).toEqual({ numerator: ['1'], denominator: ['0', '1', '1'] });
  });

  test('sums are put over one denominator: 1 - 1/n² = (n² - 1)/n²', () => {
    expect(partsOf('1-\\frac{1}{n^{2}}')).toEqual({ numerator: ['-1', '0', '1'], denominator: ['0', '0', '1'] });
  });

  test('common factors cancel and the denominator is made monic: (2n - 2)/(4n² - 4) = (1/2)/(n + 1)', () => {
    expect(partsOf('\\frac{2n-2}{4n^{2}-4}')).toEqual({ numerator: ['1/2'], denominator: ['1', '1'] });
  });

  test('anything else is not a rational function', () => {
    expect(partsOf('\\sin n')).toBeNull();
    expect(partsOf('\\sqrt{n}')).toBeNull();
    expect(partsOf('\\pi n')).toBeNull();
    expect(partsOf('nx')).toBeNull();
  });
});
