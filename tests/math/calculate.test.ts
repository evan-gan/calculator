import { describe, expect, test } from 'vitest';
import { calculate } from '../../src/math';

describe('calculate (UI entry point)', () => {
  test('empty input', () => {
    expect(calculate('  ')).toEqual({ kind: 'empty' });
  });

  test('numbers give an exact answer and a decimal answer', () => {
    expect(calculate('\\sqrt{72}')).toEqual({ kind: 'value', result: { exact: '=6 \\sqrt{2}', decimal: '\\approx 8.48528137424' } });
    expect(calculate('\\frac{1}{4}')).toEqual({ kind: 'value', result: { exact: '=\\frac{1}{4}', decimal: '=0.25' } });
  });

  test('a one-variable expression is simplified and its roots are reported', () => {
    const result = calculate('x^{2}-4');
    expect(result.kind).toBe('simplified');
    if (result.kind !== 'simplified') return;
    expect(result.result.exact).toBe('=x^{2}-4');
    expect(result.roots?.exactLines).toEqual(['x=\\pm 2']);
  });

  test('decimal mode turns coefficients into decimals but keeps variables', () => {
    const result = calculate('x^{2}-\\sqrt{2}x');
    if (result.kind !== 'simplified') throw new Error('expected simplified');
    expect(result.result.decimal).toBe('=x^{2}-1.41421356237 x');
  });

  test('multi-variable expressions are simplified without roots', () => {
    const result = calculate('x+y+x');
    expect(result).toMatchObject({ kind: 'simplified', roots: null, result: { exact: '=2 x+y' } });
  });

  test('equations without variables are checked', () => {
    expect(calculate('2+2=4')).toEqual({ kind: 'truth', isTrue: true });
    expect(calculate('\\sqrt{2}^{2}=3')).toEqual({ kind: 'truth', isTrue: false });
  });

  test('equations with two unknowns explain the limitation', () => {
    expect(calculate('x+y=1')).toEqual({
      kind: 'error',
      message: 'Solving works with one unknown at a time, but this equation has x, y.',
    });
  });

  test('bad input returns an error instead of throwing', () => {
    expect(calculate('\\frac{1}{0}')).toEqual({ kind: 'error', message: 'Division by zero is undefined.' });
    expect(calculate('2+').kind).toBe('error');
  });
});
