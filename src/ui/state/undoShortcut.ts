export type HistoryCommand = 'undo' | 'redo';

/** The parts of a KeyboardEvent the shortcut depends on (so it can be tested without a DOM). */
export interface ShortcutKeys {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * Which history command a key press asks for: ⌘Z / Ctrl+Z undo; ⌘⇧Z, Ctrl+Shift+Z and Ctrl+Y
 * redo (Ctrl+Y is the Windows habit). Returns null for any other key.
 */
export function historyCommandFor(keys: ShortcutKeys): HistoryCommand | null {
  const commandKey = keys.metaKey || keys.ctrlKey;
  if (!commandKey || keys.altKey) return null;
  // With Shift held, some browsers report "Z" rather than "z".
  const key = keys.key.toLowerCase();
  if (key === 'z') return keys.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && keys.ctrlKey && !keys.metaKey && !keys.shiftKey) return 'redo';
  return null;
}
