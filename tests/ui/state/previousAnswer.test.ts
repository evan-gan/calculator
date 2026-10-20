import { describe, expect, test } from 'vitest';
import type { CalculationResult } from '../../../src/math';
import { previousAnswer } from '../../../src/ui/state/previousAnswer';

const value = (exact: string): CalculationResult => ({ kind: 'value', result: { exact, decimal: exact, scientific: exact } });

describe('previousAnswer: what the ans key inserts', () => {
  test('the nearest numeric line above, without its "="', () => {
    expect(previousAnswer([value('=3'), value('=\\sqrt{2}'), { kind: 'empty' }], 2)).toBe('\\sqrt{2}');
  });

  test('skips lines that are not numbers', () => {
    expect(previousAnswer([value('=7'), { kind: 'error', message: 'bad' }, { kind: 'empty' }], 2)).toBe('7');
  });

  test('null when there is no number above', () => {
    expect(previousAnswer([{ kind: 'empty' }, value('=1')], 0)).toBeNull();
  });
});
