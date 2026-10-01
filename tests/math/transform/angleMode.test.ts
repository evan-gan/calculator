import { describe, expect, test } from 'vitest';
import { calculate } from '../../../src/math';

const degrees = { angleMode: 'degrees' as const };

describe('degree mode', () => {
  test('trig functions read their input in degrees', () => {
    expect(calculate('\\sin\\left(30\\right)', degrees)).toMatchObject({ kind: 'value', result: { exact: '=\\frac{1}{2}' } });
    expect(calculate('\\tan\\left(45\\right)', degrees)).toMatchObject({ kind: 'value', result: { exact: '=1' } });
  });

  test('inverse trig functions answer in degrees', () => {
    expect(calculate('\\arccos\\left(\\frac{1}{2}\\right)', degrees)).toMatchObject({ kind: 'value', result: { exact: '=60' } });
  });

  test('trig equations are solved in degrees with a 360° period', () => {
    const result = calculate('\\sin\\left(x\\right)=\\frac{1}{2}', degrees);
    if (result.kind !== 'solved') throw new Error('expected a solved result');
    expect(result.solutions.exactLines).toEqual(['x=30+360 n', 'x=150+360 n']);
  });

  test('radians stay the default', () => {
    expect(calculate('\\sin\\left(\\frac{\\pi}{6}\\right)')).toMatchObject({ result: { exact: '=\\frac{1}{2}' } });
  });
});
