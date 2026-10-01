import { describe, expect, test } from 'vitest';
import { numericIntegral } from '../../../src/math/calculus/numericIntegral';

describe('numeric integration', () => {
  test('smooth integrands are accurate to many digits', () => {
    expect(numericIntegral(Math.sin, 0, Math.PI)).toBeCloseTo(2, 12);
    expect(numericIntegral((x) => Math.exp(-x * x), -Infinity, Infinity)).toBeCloseTo(Math.sqrt(Math.PI), 9);
  });

  test('reversed limits negate the result', () => {
    expect(numericIntegral((x) => x, 1, 0)).toBeCloseTo(-0.5, 12);
  });

  test('integrable endpoint singularities converge', () => {
    expect(numericIntegral((x) => 1 / Math.sqrt(x), 0, 1)).toBeCloseTo(2, 6);
  });

  test('divergent integrals return null', () => {
    expect(numericIntegral((x) => 1 / x, 0, 1)).toBeNull();
    expect(numericIntegral((x) => 1 / x, 1, Infinity)).toBeNull();
  });

  test('splitting at a breakpoint catches a singularity inside the interval', () => {
    expect(numericIntegral((x) => 1 / (x * x), -1, 1, [0])).toBeNull();
  });

  test('undefined values make the integral fail', () => {
    expect(numericIntegral(Math.log, -1, 1)).toBeNull();
  });
});
