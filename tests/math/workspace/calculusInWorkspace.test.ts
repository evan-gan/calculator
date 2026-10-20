import { describe, expect, test } from 'vitest';
import { evaluateWorkspace } from '../../../src/math';

const results = (lines: string[]) => evaluateWorkspace(lines).map((line) => line.result);

describe('calculus with variables from other lines', () => {
  test('a defined x evaluates a derivative at that point', () => {
    expect(results(['x=2', '\\frac{d}{dx}x^{3}'])[1]).toMatchObject({ kind: 'value', result: { exact: '=12' } });
  });

  test('other defined letters are constants', () => {
    expect(results(['a=3', '\\frac{d}{dx}x^{a}'])[1]).toMatchObject({ result: { exact: '=3 x^{2}' } });
  });

  test("a sum's index ignores a variable of the same name, but its limits use them", () => {
    expect(results(['n=5', '\\sum _{n=1}^{3}n'])[1]).toMatchObject({ result: { exact: '=6' } });
    expect(results(['k=10', '\\sum _{n=1}^{k}n'])[1]).toMatchObject({ result: { exact: '=55' } });
  });

  test('an integral can define a variable', () => {
    expect(results(['F=\\int _0^1x\\,dx', '2F'])[1]).toMatchObject({ result: { exact: '=1' } });
  });

  test("an indefinite integral keeps its variable even when it's defined elsewhere", () => {
    expect(results(['x=3', '\\int x\\,dx'])[1]).toMatchObject({ result: { exact: '=\\frac{x^{2}}{2}+C' } });
  });
});

describe('definitions without an exact value', () => {
  test('show their approximation and still work in other lines', () => {
    const [definition, usage] = results(['f=\\int _0^1e^{x^{2}}dx', '2f']);
    expect(definition).toEqual({ kind: 'solved', solutions: { exactLines: ['f\\approx 1.46265174591'], decimalLines: ['f\\approx 1.46265174591'], scientificLines: ['f\\approx 1.46265174591\\times10^{0}'], notes: [] } });
    expect(usage).toMatchObject({ result: { exact: '\\approx 2.92530349181' } });
  });
});
