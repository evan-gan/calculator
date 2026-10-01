import { describe, expect, test } from 'vitest';
import { solveLatex } from '../../../helpers';

describe('numeric fallback', () => {
  test('x = cos x has no exact form and is labelled approximate', () => {
    const display = solveLatex('x=\\cos\\left(x\\right)');
    expect(display.exactLines).toEqual(['x\\approx 0.739085133215']);
    expect(display.notes).toEqual(['No exact form was found, so these values are approximate.']);
  });

  test('poles of tan are not mistaken for roots', () => {
    const display = solveLatex('\\tan\\left(x\\right)=x+100');
    expect(display.exactLines[0].startsWith('x\\approx')).toBe(true);
  });
});
