import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('combining logarithms', () => {
  test('log₂x + log₂(x-2) = 3 keeps only the root inside the domain', () => {
    expect(solveLatex('\\log_{2}\\left(x\\right)+\\log_{2}\\left(x-2\\right)=3').exactLines).toEqual(['x=4']);
  });

  test('natural logs on both sides', () => {
    expect(solveLatex('\\ln\\left(x\\right)+\\ln\\left(x+1\\right)=\\ln\\left(6\\right)').exactLines).toEqual(['x=2']);
  });
});
