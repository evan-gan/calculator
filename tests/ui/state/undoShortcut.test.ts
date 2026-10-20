import { describe, expect, test } from 'vitest';
import { historyCommandFor } from '../../../src/ui/state/undoShortcut';

const press = (key: string, modifiers: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe('historyCommandFor: undo/redo keyboard shortcuts', () => {
  test('⌘Z and Ctrl+Z undo', () => {
    expect(historyCommandFor(press('z', { metaKey: true }))).toBe('undo');
    expect(historyCommandFor(press('z', { ctrlKey: true }))).toBe('undo');
  });

  test('⌘⇧Z and Ctrl+Shift+Z redo, whether the key reports z or Z', () => {
    expect(historyCommandFor(press('Z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(historyCommandFor(press('z', { ctrlKey: true, shiftKey: true }))).toBe('redo');
  });

  test('Ctrl+Y redoes', () => {
    expect(historyCommandFor(press('y', { ctrlKey: true }))).toBe('redo');
  });

  test('plain letters and other shortcuts are left alone', () => {
    expect(historyCommandFor(press('z'))).toBeNull();
    expect(historyCommandFor(press('c', { metaKey: true }))).toBeNull();
    expect(historyCommandFor(press('z', { metaKey: true, altKey: true }))).toBeNull();
    expect(historyCommandFor(press('y', { metaKey: true }))).toBeNull();
  });
});
