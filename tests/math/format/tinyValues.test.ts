import { describe, expect, test } from 'vitest';
import { calculate, evaluateWorkspace } from '../../../src/math';
import { constantToFloatLatex } from '../../../src/math/format/toDecimal';
import { parseExpr } from '../../helpers';

describe('tiny irrational values keep their digits', () => {
  test('a value far below 1e-13 with no cancellation is not shown as 0', () => {
    const result = calculate('\\frac{1029-588\\sqrt{3}}{640000000000000}');
    expect(result).toMatchObject({ kind: 'value', result: { decimal: '\\approx 1.64908205461\\times10^{-14}' } });
  });

  test('tiny products of radicals and π print in both decimal modes', () => {
    expect(calculate('\\sqrt{2}\\cdot10^{-20}')).toMatchObject({ result: { decimal: '\\approx 1.41421356237\\times10^{-20}' } });
    expect(calculate('\\pi\\cdot10^{-30}')).toMatchObject({ result: { scientific: '\\approx 3.14159265359\\times10^{-30}' } });
  });

  test('variables defined on other lines combine into a tiny answer (Coulomb example)', () => {
    const results = evaluateWorkspace(
      ['k=9\\cdot10^9', 'F=\\tan\\left(15\\right)\\cdot0.0015\\cdot9.8', 'r=\\sin\\left(15\\right)\\cdot0.75', '\\frac{F\\cdot r^2}{k}'],
      { angleMode: 'degrees' },
    );
    expect(results[3].result).toMatchObject({ result: { scientific: '\\approx 1.64908205461\\times10^{-14}' } });
  });

  test('cancellation noise between large terms still reads as 0', () => {
    // √2·√2 isn't simplified here, so the float sum is pure rounding error.
    expect(constantToFloatLatex(parseExpr('\\sqrt{2}\\cdot\\sqrt{2}-2'))).toBe('0');
  });

  test('tiny function values follow the size of their argument', () => {
    expect(calculate('\\sin\\left(10^{-20}\\right)')).toMatchObject({ result: { scientific: '\\approx 1\\times10^{-20}' } });
    expect(calculate('\\arctan\\left(3\\cdot10^{-18}\\right)')).toMatchObject({ result: { decimal: '\\approx 3\\times10^{-18}' } });
    expect(calculate('\\sin\\left(\\sqrt{2}\\cdot10^{-20}\\right)')).toMatchObject({
      result: { decimal: '\\approx 1.41421356237\\times10^{-20}' },
    });
  });

  test('function noise at large arguments still reads as 0', () => {
    // sin(√2·√2·π) is sin(2π) in floats, ≈ -2.4e-16 of rounding error.
    expect(constantToFloatLatex(parseExpr('\\sin\\left(\\sqrt{2}\\cdot\\sqrt{2}\\cdot\\pi\\right)'))).toBe('0');
    expect(constantToFloatLatex(parseExpr('\\ln\\left(\\sqrt{2}\\cdot\\sqrt{2}-1\\right)'))).toBe('0');
  });
});
