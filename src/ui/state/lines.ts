import type { ExpressionLine } from '../types';

// Pure helpers for editing the expression list; App.svelte owns the state.

/** Insert `line` right after the line with `afterId` (or at the end if it isn't found). */
export function insertLineAfter(lines: ExpressionLine[], afterId: number, line: ExpressionLine): ExpressionLine[] {
  const index = lines.findIndex((candidate) => candidate.id === afterId);
  if (index < 0) return [...lines, line];
  return [...lines.slice(0, index + 1), line, ...lines.slice(index + 1)];
}

/**
 * Remove a line, keeping at least one (an emptied single line instead of none).
 *
 * Returns:
 *   lines: the new list
 *   focusId: the line that should get focus next (the one above, else the one below)
 */
export function removeLine(
  lines: ExpressionLine[],
  id: number,
  createEmpty: () => ExpressionLine,
): { lines: ExpressionLine[]; focusId: number } {
  const index = lines.findIndex((line) => line.id === id);
  if (index < 0) return { lines, focusId: lines[0].id };
  const remaining = lines.filter((line) => line.id !== id);
  if (remaining.length === 0) {
    const empty = createEmpty();
    return { lines: [empty], focusId: empty.id };
  }
  return { lines: remaining, focusId: remaining[Math.max(0, index - 1)].id };
}

/** Id of the line `offset` positions away (-1 = above), or null at either end. */
export function neighborId(lines: ExpressionLine[], id: number, offset: number): number | null {
  const index = lines.findIndex((line) => line.id === id);
  return lines[index + offset]?.id ?? null;
}

/** Next unused id, so restored or saved lines never collide with new ones. */
export function nextFreeId(lines: ExpressionLine[]): number {
  return lines.reduce((highest, line) => Math.max(highest, line.id), -1) + 1;
}
