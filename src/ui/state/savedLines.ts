import type { ExpressionLine } from '../types';

// The expression list is kept in this browser between visits. Storage can be unavailable
// (private mode, blocked site data), in which case the app simply starts empty.
const STORAGE_KEY = 'exact-calculator:lines';

function isExpressionLine(value: unknown): value is ExpressionLine {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ExpressionLine).id === 'number' &&
    typeof (value as ExpressionLine).latex === 'string'
  );
}

/** Saved lines, or null if there are none or they can't be read. */
export function loadSavedLines(): ExpressionLine[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isExpressionLine) ? parsed : null;
  } catch (error) {
    console.warn('Could not read saved calculator lines; starting fresh.', error);
    return null;
  }
}

export function saveLines(lines: ExpressionLine[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch (error) {
    console.warn('Could not save calculator lines (browser storage unavailable).', error);
  }
}
