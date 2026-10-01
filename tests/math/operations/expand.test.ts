import { describe, expect, test } from 'vitest';
import { expandAll } from '../../../src/math/operations/expand';
import { toLatex } from '../../../src/math/format/toLatex';
import { simplify } from '../../../src/math/simplify/simplify';
import { parseExpr } from '../../helpers';

const expandLatex = (latex: string) => toLatex(expandAll(simplify(parseExpr(latex))));

describe('expandAll', () => {
  test.each([
    ['\\left(x+1\\right)\\left(x-1\\right)', 'x^{2}-1'],
    ['\\left(x+1\\right)^{3}', 'x^{3}+3 x^{2}+3 x+1'],
    ['x\\left(x+2\\right)-2x', 'x^{2}'],
  ])('%s expands to %s', (input, expected) => {
    expect(expandLatex(input)).toBe(expected);
  });
});
