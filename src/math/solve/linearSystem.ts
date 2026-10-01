import { num, type Expr } from '../ast/nodes';
import { evaluate } from '../evaluate/evaluate';
import { differenceOf, productOf, quotientOf } from '../operations/arithmetic';

// Exact Gaussian elimination for small square systems whose entries are constant expressions
// (rationals, radicals, π...). Partial fractions over irrational factors use it.

// Pivots whose value rounds to below this are treated as zero.
const ZERO_TOLERANCE = 1e-9;

/**
 * Solve matrix · unknowns = rightSide exactly.
 *
 * Args:
 *   matrix: n rows of n variable-free simplified expressions
 *   rightSide: n variable-free simplified expressions
 *
 * Returns:
 *   The n unknowns, or null when the system is singular.
 */
export function solveLinearSystem(matrix: Expr[][], rightSide: Expr[]): Expr[] | null {
  const size = rightSide.length;
  const rows = matrix.map((row, index) => [...row, rightSide[index]]);
  for (let column = 0; column < size; column++) {
    // The largest pivot keeps the float-based zero test meaningful.
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(evaluate(rows[row][column])) > Math.abs(evaluate(rows[pivot][column]))) pivot = row;
    }
    if (!(Math.abs(evaluate(rows[pivot][column])) > ZERO_TOLERANCE)) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    for (let row = 0; row < size; row++) {
      if (row === column) continue;
      const factor = quotientOf(rows[row][column], rows[column][column]);
      rows[row] = rows[row].map((entry, index) => (index === column ? num(0) : differenceOf(entry, productOf(factor, rows[column][index]))));
    }
  }
  return rows.map((row, index) => quotientOf(row[size], row[index]));
}
