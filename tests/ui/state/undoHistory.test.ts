import { describe, expect, test } from 'vitest';
import { UndoHistory } from '../../../src/ui/state/undoHistory';

describe('UndoHistory', () => {
  test('undo returns earlier snapshots in reverse order, redo walks forward again', () => {
    const history = new UndoHistory<string>();
    history.record('');
    history.record('1');
    expect(history.undo('12')).toBe('1');
    expect(history.undo('1')).toBe('');
    expect(history.undo('')).toBeNull();
    expect(history.redo('')).toBe('1');
    expect(history.redo('1')).toBe('12');
    expect(history.canRedo).toBe(false);
  });

  test('a new edit after undo discards the redo branch', () => {
    const history = new UndoHistory<string>();
    history.record('a');
    history.undo('ab');
    history.record('a');
    expect(history.canRedo).toBe(false);
  });

  test('old snapshots beyond the limit are dropped', () => {
    const history = new UndoHistory<number>(2);
    [1, 2, 3].forEach((value) => history.record(value));
    expect(history.undo(4)).toBe(3);
    expect(history.undo(3)).toBe(2);
    expect(history.undo(2)).toBeNull();
  });
});
