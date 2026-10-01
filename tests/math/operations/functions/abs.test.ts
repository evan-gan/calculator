import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('absolute value', () => {
  test.each([
    ['\\left|-3\\right|', '3'],
    ['\\left|1-\\sqrt{2}\\right|', '\\sqrt{2}-1'],
    ['\\left|-x\\right|', '\\left|x\\right|'],
    ['\\left|x^{2}\\right|', 'x^{2}'],
    ['\\left|\\left|x\\right|\\right|', '\\left|x\\right|'],
  ])('%s = %s', (input, expected) => {
    expect(simplifyLatex(input)).toBe(expected);
  });
});
