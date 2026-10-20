import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../helpers';

describe('multiplying out products when terms cancel', () => {
  test.each([
    ['a\\left(b+c\\right)-ab', 'a c'],
    ['x\\left(x+1\\right)-x^2', 'x'],
    ['\\left(x+1\\right)\\left(x-1\\right)+1', 'x^{2}'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });

  test.each([
    ['x\\left(x+1\\right)+1', 'x \\left(x+1\\right)+1'],
    ['\\left(a+b\\right)\\left(a-b\\right)', '\\left(a+b\\right) \\left(a-b\\right)'],
  ])('keeps products factored when nothing cancels: %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });
});
