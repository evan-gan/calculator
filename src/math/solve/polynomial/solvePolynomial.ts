import { num, type Expr } from '../../ast/nodes';
import { evaluate } from '../../evaluate/evaluate';
import { gcdBig } from '../../number/integer';
import type { Rational } from '../../number/rational';
import { negated, quotientOf } from '../../operations/arithmetic';
import { exact, type CandidateResult, type Solution } from '../types';
import { isZeroExpr, trimLeadingZeros } from './extract';
import { solveCubic } from './cubic';
import { approximateRealRoots } from './numericRoots';
import { solvePurePower } from './pureRoots';
import { solveQuadratic } from './quadratic';
import { extractRationalRoots } from './rationalRoots';

// Polynomial equation solver. Order of attack (from 03-exact-solutions.md):
// factor out x^k, rational roots, x^n = c, substitution u = x^g, formulas, then numeric.

function rationalCoefficients(coefficients: Expr[]): Rational[] | null {
  const values: Rational[] = [];
  for (const coefficient of coefficients) {
    if (coefficient.type !== 'num') return null;
    values.push(coefficient.value);
  }
  return values;
}

/**
 * Solve c0 + c1·x + ... + cn·x^n = 0.
 *
 * Args:
 *   coefficients: variable-free coefficients, low -> high degree
 *
 * Returns:
 *   'identity' for the zero polynomial, otherwise the real solutions found.
 */
export function solvePolynomial(coefficients: Expr[]): CandidateResult {
  let remaining = trimLeadingZeros(coefficients);
  if (remaining.length === 0) return 'identity';
  const solutions: Solution[] = [];
  // x^k·(...) = 0 has the root x = 0.
  const lowestDegree = remaining.findIndex((coefficient) => !isZeroExpr(coefficient));
  if (lowestDegree > 0) {
    solutions.push(exact(num(0)));
    remaining = remaining.slice(lowestDegree);
  }
  const rationals = rationalCoefficients(remaining);
  if (rationals && remaining.length > 2) {
    const { roots, remaining: deflated } = extractRationalRoots(rationals);
    solutions.push(...roots.map((root) => exact(num(root))));
    remaining = deflated.map((value) => num(value));
  }
  return [...solutions, ...solveWithoutRationalRoots(remaining)];
}

/** Exponents present with non-zero coefficients, e.g. x⁴ - 5x² + 4 -> [0, 2, 4]. */
function nonZeroDegrees(coefficients: Expr[]): number[] {
  return coefficients.flatMap((coefficient, degree) => (isZeroExpr(coefficient) ? [] : [degree]));
}

function solveWithoutRationalRoots(coefficients: Expr[]): Solution[] {
  const degree = coefficients.length - 1;
  if (degree <= 0) return [];
  const leading = coefficients[degree];
  if (degree === 1) return [exact(quotientOf(negated(coefficients[0]), leading))];

  const degrees = nonZeroDegrees(coefficients);
  // a·x^n + c = 0  ->  x^n = -c/a
  if (degrees.length === 2 && degrees[0] === 0) {
    return solvePurePower(BigInt(degree), quotientOf(negated(coefficients[0]), leading)).map((root) => exact(root));
  }
  // Only powers of x^g appear (like x⁴ - 5x² + 4): solve for u = x^g, then x^g = u.
  const commonStep = Number(degrees.reduce((step, value) => gcdBig(step, BigInt(value)), 0n));
  if (commonStep > 1) return solveBySubstitution(coefficients, commonStep);

  if (degree === 2) return solveQuadratic(coefficients[0], coefficients[1], coefficients[2]).map((root) => exact(root));
  const rationals = rationalCoefficients(coefficients);
  if (degree === 3 && rationals) return solveCubic(rationals).map((root) => exact(root));
  return approximateRealRoots(coefficients.map((coefficient) => evaluate(coefficient))).map((value) => ({
    kind: 'approximate',
    value,
  }));
}

function solveBySubstitution(coefficients: Expr[], step: number): Solution[] {
  const reduced = coefficients.filter((_, degree) => degree % step === 0);
  const innerSolutions = solvePolynomial(reduced);
  if (innerSolutions === 'identity') return [];
  return innerSolutions.flatMap((solution): Solution[] => {
    if (solution.kind === 'approximate') {
      // Undo u = x^g numerically: real g-th roots of an approximate u.
      if (solution.value < 0 && step % 2 === 0) return [];
      const magnitude = Math.pow(Math.abs(solution.value), 1 / step) * Math.sign(solution.value);
      return step % 2 === 0
        ? [{ kind: 'approximate', value: magnitude }, { kind: 'approximate', value: -magnitude }]
        : [{ kind: 'approximate', value: magnitude }];
    }
    return solvePurePower(BigInt(step), solution.value).map((root) => exact(root));
  });
}
