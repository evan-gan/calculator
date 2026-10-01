import { describe, expect, test } from 'vitest';
import { calculate } from '../../../src/math';

describe('calculus results on screen', () => {
  test('indefinite integrals end in + C and show no roots', () => {
    expect(calculate('\\int x^{2}dx')).toEqual({
      kind: 'simplified',
      result: { exact: '=\\frac{x^{3}}{3}+C', decimal: '=0.333333333333 x^{3}+C' },
      roots: null,
      variable: null,
    });
    expect(calculate('\\int 0dx')).toMatchObject({ result: { exact: '=C' } });
  });

  test('a derivative of an integral has no + C', () => {
    expect(calculate('\\frac{d}{dx}\\int x^{2}dx')).toMatchObject({ result: { exact: '=x^{2}' } });
  });

  test('derivatives report where they are zero (critical points)', () => {
    expect(calculate('\\frac{d}{dx}\\left(x^{3}-3x\\right)')).toMatchObject({ roots: { exactLines: ['x=\\pm 1'] } });
  });

  test('equations can contain derivatives', () => {
    expect(calculate('\\frac{d}{dx}x^{3}=12')).toEqual({ kind: 'solved', solutions: { exactLines: ['x=\\pm 2'], decimalLines: ['x=-2,\\ 2'], notes: [] } });
  });

  test('exact definite values', () => {
    expect(calculate('\\int _0^1x^{2}dx')).toEqual({ kind: 'value', result: { exact: '=\\frac{1}{3}', decimal: '\\approx 0.333333333333' } });
  });

  test('decimal mode keeps e as a letter in powers', () => {
    expect(calculate('\\frac{d}{dx}e^{3x}')).toMatchObject({ result: { decimal: '=3 e^{3 x}' } });
  });

  test('errors in calculus input come back as error results', () => {
    expect(calculate('\\int x')).toMatchObject({ kind: 'error' });
  });
});
