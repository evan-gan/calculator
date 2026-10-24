import { describe, expect, test } from 'vitest';
import { calculate, evaluateGraphWorkspace, evaluateWorkspace, type CalculationResult } from '../../src/math';

function categoryOf(result: CalculationResult): string | null {
  return result.kind === 'error' ? result.category : null;
}

describe('error categories (how the UI colors an error)', () => {
  test('syntax mistakes are invalid', () => {
    expect(categoryOf(calculate('2+'))).toBe('invalid');
    expect(categoryOf(calculate('\\left(\\right)'))).toBe('invalid');
  });

  test('math errors like division by zero are invalid', () => {
    expect(categoryOf(calculate('\\frac{1}{0}'))).toBe('invalid');
  });

  test('things the calculator cannot do yet are unsupported', () => {
    expect(categoryOf(calculate('x<3'))).toBe('unsupported');
    expect(categoryOf(calculate('\\int e^{x^{2}}dx'))).toBe('unsupported');
  });

  test('an equation with more than one unknown is unresolved', () => {
    expect(categoryOf(calculate('x+y=1'))).toBe('unresolved');
  });

  test('using a variable that has several values is unresolved', () => {
    const [, usage] = evaluateWorkspace(['a^{2}=4', 'a+1']);
    expect(categoryOf(usage.result)).toBe('unresolved');
  });

  test('a graph that needs a value for another variable is unresolved', () => {
    const [line] = evaluateGraphWorkspace(['y=ax']);
    expect(categoryOf(line.result)).toBe('unresolved');
  });

  test('circular and duplicate definitions are invalid', () => {
    const circular = evaluateWorkspace(['a=b+1', 'b=a+1']);
    expect(circular.map((line) => categoryOf(line.result))).toContain('invalid');
    const duplicate = evaluateWorkspace(['a=1', 'a=2']);
    expect(categoryOf(duplicate[0].result)).toBe('invalid');
  });
});
