import { describe, expect, test } from 'vitest';
import { insertLineAfter, neighborId, nextFreeId, removeLine } from '../../../src/ui/state/lines';

const lines = [
  { id: 0, latex: 'a' },
  { id: 1, latex: 'b' },
  { id: 2, latex: 'c' },
];

describe('expression list helpers', () => {
  test('inserts a new line right after the given one', () => {
    expect(insertLineAfter(lines, 0, { id: 9, latex: '' }).map((line) => line.id)).toEqual([0, 9, 1, 2]);
  });

  test('removing a line focuses the one above it, or below for the first line', () => {
    expect(removeLine(lines, 1, () => ({ id: 9, latex: '' }))).toMatchObject({ focusId: 0 });
    expect(removeLine(lines, 0, () => ({ id: 9, latex: '' }))).toMatchObject({ focusId: 1 });
  });

  test('removing the last remaining line leaves one empty line', () => {
    expect(removeLine([{ id: 4, latex: 'x' }], 4, () => ({ id: 5, latex: '' }))).toEqual({
      lines: [{ id: 5, latex: '' }],
      focusId: 5,
    });
  });

  test('neighbors and free ids', () => {
    expect(neighborId(lines, 1, -1)).toBe(0);
    expect(neighborId(lines, 2, 1)).toBeNull();
    expect(nextFreeId(lines)).toBe(3);
  });
});
