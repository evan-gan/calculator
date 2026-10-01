import { describe, expect, test } from 'vitest';
import { num, sqrt, type Expr } from '../../../src/math/ast/nodes';
import { toLatex } from '../../../src/math/format/toLatex';
import { simplify } from '../../../src/math/simplify/simplify';
import { solveLinearSystem } from '../../../src/math/solve/linearSystem';

const ROOT_TWO = simplify(sqrt(num(2)));
const latexOf = (values: Expr[] | null) => values?.map(toLatex) ?? null;

describe('exact linear systems', () => {
  test('rational entries: x + y = 3, x - y = 1 gives x = 2, y = 1', () => {
    expect(latexOf(solveLinearSystem([[num(1), num(1)], [num(1), num(-1)]], [num(3), num(1)]))).toEqual(['2', '1']);
  });

  test('radical entries: √2·x = 2 gives x = √2', () => {
    expect(latexOf(solveLinearSystem([[ROOT_TWO]], [num(2)]))).toEqual(['\\sqrt{2}']);
  });

  test('a zero in the first pivot position is swapped away', () => {
    expect(latexOf(solveLinearSystem([[num(0), num(1)], [num(1), num(0)]], [num(5), num(7)]))).toEqual(['7', '5']);
  });

  test('singular systems return null', () => {
    expect(solveLinearSystem([[num(1), num(2)], [num(2), num(4)]], [num(1), num(2)])).toBeNull();
  });
});
