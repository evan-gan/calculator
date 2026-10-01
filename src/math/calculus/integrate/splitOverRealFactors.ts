import { add, func, mul, num, pow, variable as variableNode, type Expr } from '../../ast/nodes';
import type { Rational } from '../../number/rational';
import type { RationalPolynomial } from '../../number/rationalPolynomial';
import { negated, productOf, quotientOf, sumOf } from '../../operations/arithmetic';
import { solveLinearSystem } from '../../solve/linearSystem';
import { integrateLinearOverQuadraticPower } from './quadratic';
import { factorOverReals, type RealFactor } from './realFactors';

// ∫ M(x)/Q(x) dx when Q has no rational roots but splits into real factors with irrational
// coefficients (x⁴ + 1, x³ + 2, (x² + 1)²). The numerators of the partial fractions
//   M/Q = Σ over factors F and powers k ≤ mult(F) of  Nₖ(x)/F^k,  deg Nₖ < deg F
// are found by matching coefficients: a small linear system with radical entries.

type ExprPolynomial = Expr[];

function multiplyExprPolynomials(first: ExprPolynomial, second: ExprPolynomial): ExprPolynomial {
  const product: Expr[][] = Array.from({ length: first.length + second.length - 1 }, () => []);
  first.forEach((left, i) => second.forEach((right, j) => product[i + j].push(productOf(left, right))));
  return product.map((terms) => sumOf(...terms));
}

function productOfFactors(factors: ExprPolynomial[]): ExprPolynomial {
  return factors.reduce(multiplyExprPolynomials, [num(1)]);
}

/** One partial-fraction slot: numerator of degree < deg(factor) over factor^power. */
type Slot = { factor: RealFactor; power: number };

function slotsOf(factors: RealFactor[]): Slot[] {
  return factors.flatMap((factor) => Array.from({ length: factor.multiplicity }, (_, index) => ({ factor, power: index + 1 })));
}

/** Q/F^k as a polynomial: every other factor at full multiplicity, and F at multiplicity - k. */
function cofactorOf(slot: Slot, factors: RealFactor[]): ExprPolynomial {
  const parts = factors.flatMap((factor) => {
    const times = factor === slot.factor ? factor.multiplicity - slot.power : factor.multiplicity;
    return Array.from({ length: times }, () => factor.coefficients);
  });
  return productOfFactors(parts);
}

/** The numerator coefficients of every slot, lowest degree first, or null if the system is singular. */
function solveNumerators(numerator: RationalPolynomial, leading: Rational, factors: RealFactor[], slots: Slot[]): Expr[][] | null {
  // Column j of the system is x^d·(Q/F^k): the coefficient of the d-th unknown of a slot.
  const columns: ExprPolynomial[] = [];
  for (const slot of slots) {
    const cofactor = cofactorOf(slot, factors);
    for (let degree = 0; degree < slot.factor.coefficients.length - 1; degree++) {
      columns.push([...Array.from({ length: degree }, () => num(0)), ...cofactor]);
    }
  }
  const size = columns.length;
  const matrix = Array.from({ length: size }, (_, row) => columns.map((column) => column[row] ?? num(0)));
  // Q = leading · Π factors, so the factors' partial fractions must add up to M/leading.
  const rightSide = Array.from({ length: size }, (_, row) => (numerator[row] ? num(numerator[row].div(leading)) : num(0)));
  const unknowns = solveLinearSystem(matrix, rightSide);
  if (!unknowns) return null;
  let next = 0;
  return slots.map((slot) => unknowns.slice(next, (next += slot.factor.coefficients.length - 1)));
}

/** ∫ A/(x + c)^k dx */
function integrateOverLinearPower(coefficient: Expr, constant: Expr, power: number, variable: string): Expr {
  const shifted = add(variableNode(variable), constant);
  if (power === 1) return mul(coefficient, func('ln', func('abs', shifted)));
  return mul(quotientOf(negated(coefficient), num(power - 1)), pow(shifted, num(1 - power)));
}

function integrateSlot(slot: Slot, numerator: Expr[], variable: string): Expr | null {
  const [constant, linear] = slot.factor.coefficients;
  if (slot.factor.coefficients.length === 2) return integrateOverLinearPower(numerator[0], constant, slot.power, variable);
  return integrateLinearOverQuadraticPower(
    { slope: numerator[1], constant: numerator[0] },
    { p: num(1), q: linear, s: constant },
    slot.power,
    variable,
  );
}

/**
 * ∫ M(x)/Q(x) dx for rational polynomials with deg M < deg Q and Q free of rational roots,
 * or null when Q can't be split into real factors exactly.
 */
export function integrateOverRealFactors(numerator: RationalPolynomial, denominator: RationalPolynomial, variable: string): Expr | null {
  const factors = factorOverReals(denominator);
  if (!factors) return null;
  const slots = slotsOf(factors);
  const numerators = solveNumerators(numerator, denominator[denominator.length - 1], factors, slots);
  if (!numerators) return null;
  const pieces: Expr[] = [];
  for (const [index, slot] of slots.entries()) {
    if (numerators[index].every((coefficient) => coefficient.type === 'num' && coefficient.value.isZero())) continue;
    const piece = integrateSlot(slot, numerators[index], variable);
    if (!piece) return null;
    pieces.push(piece);
  }
  return pieces.length === 0 ? num(0) : add(...pieces);
}
