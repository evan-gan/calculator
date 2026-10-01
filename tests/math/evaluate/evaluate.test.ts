import { describe, expect, test } from 'vitest';
import { evaluate, numericSign } from '../../../src/math/evaluate/evaluate';
import { parseExpr } from '../../helpers';

describe('numeric evaluation', () => {
  test('substitutes variable values', () => {
    expect(evaluate(parseExpr('x^{2}+1'), { x: 3 })).toBe(10);
  });

  test('odd roots of negative numbers are real, even roots are NaN', () => {
    expect(evaluate(parseExpr('\\sqrt[3]{x}'), { x: -8 })).toBeCloseTo(-2, 12);
    expect(evaluate(parseExpr('\\sqrt{x}'), { x: -4 })).toBeNaN();
  });

  test('domain errors and unknown variables give NaN instead of throwing', () => {
    expect(evaluate(parseExpr('\\ln\\left(x\\right)'), { x: -1 })).toBeNaN();
    expect(evaluate(parseExpr('\\frac{1}{x}'), { x: 0 })).toBeNaN();
    expect(evaluate(parseExpr('y'))).toBeNaN();
  });

  test('numericSign classifies constants', () => {
    expect(numericSign(parseExpr('\\sqrt{2}-1'))).toBe(1);
    expect(numericSign(parseExpr('1-\\pi'))).toBe(-1);
    expect(numericSign(parseExpr('\\sin\\left(\\pi\\right)'))).toBe(0);
  });
});
