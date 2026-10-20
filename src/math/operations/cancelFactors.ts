import { isConstantExpr, toKey } from '../ast/inspect';
import { num, type Expr, type SumNode } from '../ast/nodes';
import { absBig, gcdBig } from '../number/integer';
import { Rational } from '../number/rational';
import {
  atomContent,
  atomPolynomialToExpr,
  atomTermToExpr,
  divideExactly,
  divideTermByTerm,
  readAtomPolynomial,
  splitAtomPower,
  type AtomPolynomial,
  type AtomTerm,
} from './atomPolynomial';
import { simplifyPower } from './power';

// Cancels factors shared by the top and bottom of a fraction that holds sums:
//   (mg sin θ − ma) / (mg cos θ)  →  (g sin θ − a) / (g cos θ)   (common factor m)
//   (x² − 1) / (x − 1)            →  x + 1                       (exact polynomial division)
// Like x/x = 1 elsewhere in the simplifier, this drops the points where the cancelled factor is 0.

// Each round cancels one pair of sums; products rarely hold more than a couple.
const MAX_DIVISION_ROUNDS = 4;

/** A factor of the product split as atom^exponent (see splitAtomPower). */
interface AtomFactor {
  factor: Expr;
  atom: Expr;
  exponent: bigint;
}

interface SumPower {
  /** The sum as read; content × primitive = polynomial. */
  polynomial: AtomPolynomial;
  content: AtomTerm;
  primitive: AtomPolynomial;
  /** The sum's own exponent; the content keeps it even when division changes `exponent`. */
  contentExponent: bigint;
  /** Exponent of the primitive part. */
  exponent: bigint;
}

/**
 * Cancel common factors in a product (already merged by multiply.ts) that has a sum and a denominator.
 *
 * Args:
 *   coefficient: the product's rational coefficient
 *   factors: its other factors, simplified and merged
 *   rebuild: turns the new factor list into a simplified product (multiply.ts passes simplifyProduct)
 *
 * Returns:
 *   the simplified product, or null when nothing cancels (so the caller keeps its own form)
 */
export function cancelCommonFactors(coefficient: Rational, factors: Expr[], rebuild: (factors: Expr[]) => Expr): Expr | null {
  const others: AtomFactor[] = [];
  const sumFactors: AtomFactor[] = [];
  for (const factor of factors) {
    const split = { factor, ...splitAtomPower(factor) };
    if (split.atom.type === 'add') sumFactors.push(split);
    else others.push(split);
  }
  if (sumFactors.length === 0 || !hasBothSides(coefficient, [...others, ...sumFactors])) return null;

  const sums = sumFactors.map(readSumPower);
  const sharedAtom = sharesAtom(others, sums);
  const divided = divideSums(sums);
  if (sharedAtom || divided) return rebuildProduct(coefficient, others, sums, rebuild);

  // With only constants beside the sums, multiply.ts distributes them, which already cancels numbers and signs.
  if (others.every(({ factor }) => isConstantExpr(factor)) && sums.every(({ exponent }) => exponent > 0n)) return null;
  // Only numbers or a sign cancel: take out just that much, so (3a + 6b)/(9c) = (a + 2b)/(3c).
  if (sharesNumber(coefficient, sums)) return rebuildProduct(coefficient, others, sums.map(numericContentOnly), rebuild);
  if (cancelsSign(coefficient, sums)) return rebuildProduct(coefficient, others, sums.map(signContentOnly), rebuild);
  return null;
}

function rebuildProduct(coefficient: Rational, others: AtomFactor[], sums: SumPower[], rebuild: (factors: Expr[]) => Expr): Expr {
  const sumFactors = sums.flatMap(({ content, contentExponent, primitive, exponent }) => [
    simplifyPower(atomTermToExpr(content, primitive.atoms), num(contentExponent)),
    simplifyPower(atomPolynomialToExpr(primitive), num(exponent)),
  ]);
  return rebuild([num(coefficient), ...others.map(({ factor }) => factor), ...sumFactors]);
}

function withContent(sum: SumPower, content: AtomTerm): SumPower {
  const { terms, atoms } = sum.polynomial;
  return { ...sum, content, primitive: { terms: terms.map((term) => divideTermByTerm(term, content)), atoms } };
}

function numericContentOnly(sum: SumPower): SumPower {
  return withContent(sum, { coefficient: sum.content.coefficient, powers: new Map() });
}

function signContentOnly(sum: SumPower): SumPower {
  const sign = sum.content.coefficient.isNegative() ? Rational.MINUS_ONE : Rational.ONE;
  return withContent(sum, { coefficient: sign, powers: new Map() });
}

/** A sum or an integer power of one, split into its content and the primitive sum left over. */
function readSumPower({ atom, exponent }: AtomFactor): SumPower {
  const polynomial = readAtomPolynomial((atom as SumNode).terms);
  const content = atomContent(polynomial);
  const primitive = { terms: polynomial.terms.map((term) => divideTermByTerm(term, content)), atoms: polynomial.atoms };
  return { polynomial, content, primitive, contentExponent: exponent, exponent };
}

/**
 * Something can only cancel with something above and below the line. A sign or a sum's
 * numeric content can cancel against the coefficient, so a coefficient other than 1 counts on both sides.
 */
function hasBothSides(coefficient: Rational, factors: AtomFactor[]): boolean {
  const isPlainOne = coefficient.isOne();
  const hasTop = !isPlainOne || factors.some(({ exponent }) => exponent > 0n);
  const hasBottom = !isPlainOne || factors.some(({ exponent }) => exponent < 0n);
  return hasTop && hasBottom;
}

/** True when some atom (or primitive sum) ends up both above and below the fraction line. */
function sharesAtom(others: AtomFactor[], sums: SumPower[]): boolean {
  const sides = new Map<string, Set<boolean>>();
  const record = (key: string, exponent: bigint) => {
    const side = sides.get(key) ?? new Set<boolean>();
    side.add(exponent > 0n);
    sides.set(key, side);
  };
  for (const { atom, exponent } of others) record(toKey(atom), exponent);
  for (const { content, primitive, exponent } of sums) {
    for (const [key, power] of content.powers) record(key, power * exponent);
    record(`sum:${polynomialKey(primitive)}`, exponent);
  }
  return [...sides.values()].some((side) => side.size === 2);
}

function polynomialKey(polynomial: AtomPolynomial): string {
  return polynomial.terms
    .map((term) => `${term.coefficient}·${[...term.powers].map(([key, power]) => `${key}^${power}`).sort().join('*')}`)
    .sort()
    .join('+');
}

/** True when the sums' numeric content shares a factor with the other side, as 3 in (3a + 6b)/(9c). */
function sharesNumber(coefficient: Rational, sums: SumPower[]): boolean {
  let top = absBig(coefficient.numerator);
  let bottom = coefficient.denominator;
  for (const { content, exponent } of sums) {
    const contentTop = absBig(content.coefficient.numerator);
    const contentBottom = content.coefficient.denominator;
    const power = absBig(exponent);
    top *= (exponent > 0n ? contentTop : contentBottom) ** power;
    bottom *= (exponent > 0n ? contentBottom : contentTop) ** power;
  }
  return gcdBig(top, bottom) > 1n;
}

/** True when pulling a minus sign out of a sum cancels the product's own: −(−a − b)/c = (a + b)/c. */
function cancelsSign(coefficient: Rational, sums: SumPower[]): boolean {
  const flips = sums.filter(({ content, exponent }) => content.coefficient.isNegative() && exponent % 2n !== 0n);
  return coefficient.isNegative() && flips.length % 2 === 1;
}

/**
 * Divide sums above the line by sums below it (or the other way round) when one divides the
 * other exactly: (x² − 1)/(x − 1) → x + 1, (x + 1)/(x² − 1) → 1/(x − 1). Updates `sums` in place.
 */
function divideSums(sums: SumPower[]): boolean {
  let dividedAny = false;
  for (let round = 0; round < MAX_DIVISION_ROUNDS; round++) {
    if (!divideOnePair(sums)) break;
    dividedAny = true;
  }
  return dividedAny;
}

function divideOnePair(sums: SumPower[]): boolean {
  for (const top of sums) {
    for (const bottom of sums) {
      if (top.exponent <= 0n || bottom.exponent >= 0n) continue;
      const quotient = divideExactly(top.primitive, bottom.primitive);
      if (quotient) {
        // top = q·bottom, so top^a · bottom^b = q^a · bottom^(a + b)
        top.primitive = quotient;
        bottom.exponent += top.exponent;
        return true;
      }
      const reverseQuotient = divideExactly(bottom.primitive, top.primitive);
      if (reverseQuotient) {
        bottom.primitive = reverseQuotient;
        top.exponent += bottom.exponent;
        return true;
      }
    }
  }
  return false;
}
