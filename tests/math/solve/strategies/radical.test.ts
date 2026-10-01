import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('radical equations', () => {
  test('squaring both sides, then dropping the extraneous root', () => {
    expect(solveLatex('\\sqrt{x+3}=x-3').exactLines).toEqual(['x=6']);
  });

  test('two radicals need two rounds of squaring', () => {
    expect(solveLatex('\\sqrt{x}+\\sqrt{x+5}=5').exactLines).toEqual(['x=4']);
  });
});
