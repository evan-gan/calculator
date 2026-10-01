import { describe, expect, test } from 'vitest';
import { parseLatex } from '../../../src/math/parse/parser';
import { MathError } from '../../../src/math/errors';

describe('parser error messages', () => {
  test.each([
    ['\\frac{}{2}', 'empty box'],
    ['\\left(1+2', 'Missing a closing'],
    ['1+2\\right)', 'extra closing'],
    ['2+', 'ends too early'],
    ['x=1=2', 'Only one "="'],
    ['\\sin', 'needs an input'],
    ['()', 'Empty parentheses'],
  ])('%s explains the problem (%s)', (latex, messagePart) => {
    expect(() => parseLatex(latex)).toThrow(MathError);
    expect(() => parseLatex(latex)).toThrow(new RegExp(messagePart.replace(/[()]/g, '\\$&'), 'i'));
  });
});
