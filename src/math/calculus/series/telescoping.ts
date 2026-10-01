import { infinityDirection } from '../../ast/calculus';
import { add, num, pow, type Expr } from '../../ast/nodes';
import { MathError } from '../../errors';
import { Rational } from '../../number/rational';
import { dividePolynomials } from '../../number/rationalPolynomial';
import { productOf, sumOf } from '../../operations/arithmetic';
import { simplify } from '../../simplify/simplify';
import { decomposePartialFractions, type LinearFraction } from '../integrate/partialFractions';
import { toRationalFunction } from '../readRationalFunction';
import { DIVERGES_MESSAGE } from './messages';
import { zetaTail } from './zeta';

// Sums of rational functions whose partial fractions cancel in a chain:
//   Σ_{n=1}^{N} 1/(n(n+1)) = Σ (1/n - 1/(n+1)) = 1 - 1/(N+1),   and → 1 as N → ∞.
// Each partial fraction c/(n - r)^k is c·f(n + s) with f(m) = 1/(m - ρ)^k, where ρ is the largest
// root that differs from r by a whole number s. Shifted copies of one f cancel except for s
// boundary terms at each end, provided their coefficients add up to 0. When they don't, what is
// left is a multiple of Σ f, which is exact for infinite sums with even k (a ζ value).

// Fractions further apart than this don't telescope in any useful sense.
const MAX_SHIFT = 100;

type Chain = { anchor: Rational; power: number; members: { shift: number; coefficient: Rational }[] };

/** Group fractions whose roots differ by whole numbers (and share a power) into chains. */
function buildChains(fractions: LinearFraction[]): Chain[] | null {
  const groups = new Map<string, LinearFraction[]>();
  for (const fraction of fractions) {
    const fractionalPart = fraction.root.sub(Rational.fromInt(fraction.root.floor()));
    const key = `${fractionalPart}|${fraction.power}`;
    groups.set(key, [...(groups.get(key) ?? []), fraction]);
  }
  const chains: Chain[] = [];
  for (const group of groups.values()) {
    const anchor = group.reduce((largest, { root }) => (root.compare(largest) > 0 ? root : largest), group[0].root);
    const members = group.map(({ root, coefficient }) => ({ shift: Number(anchor.sub(root).numerator), coefficient }));
    if (members.some(({ shift }) => shift > MAX_SHIFT)) return null;
    chains.push({ anchor, power: group[0].power, members });
  }
  return chains;
}

/** f(m) = 1/(m - anchor)^power at m = point + offset. */
function chainTermAt(chain: Chain, point: Expr, offset: number): Expr {
  return simplify(pow(add(point, num(Rational.fromInt(offset).sub(chain.anchor))), num(-chain.power)));
}

/**
 * Boundary terms Σᵢ cᵢ·(Σ_{j=1}^{sᵢ} f(upper + j) - Σ_{j=0}^{sᵢ-1} f(lower + j)); the upper ones
 * vanish for an infinite sum because f → 0.
 */
function boundaryTerms(chain: Chain, lower: Expr, upper: Expr | null): Expr {
  const terms: Expr[] = [];
  for (const { shift, coefficient } of chain.members) {
    for (let j = 0; j < shift; j++) {
      terms.push(productOf(num(coefficient.neg()), chainTermAt(chain, lower, j)));
      if (upper) terms.push(productOf(num(coefficient), chainTermAt(chain, upper, j + 1)));
    }
  }
  return sumOf(...terms);
}

/** Σ_{n=lower}^{∞} f(n) for a chain whose coefficients don't cancel: a ζ tail when the anchor is a whole number. */
function leftoverInfiniteSum(chain: Chain, lower: Expr): Expr | null {
  if (!chain.anchor.isInteger() || lower.type !== 'num' || !lower.value.isInteger()) return null;
  // Σ_{n=a}^{∞} 1/(n - ρ)^k = Σ_{m=a-ρ}^{∞} 1/m^k
  return zetaTail(chain.power, lower.value.sub(chain.anchor).numerator);
}

/** A root at a whole number inside the range makes a term divide by zero. */
function assertNoPoleInRange(fractions: LinearFraction[], index: string, lower: Expr, upper: Expr): void {
  if (lower.type !== 'num') return;
  for (const { root } of fractions) {
    const aboveLower = root.isInteger() && root.compare(lower.value) >= 0;
    const belowUpper = upper.type !== 'num' || root.compare(upper.value) <= 0;
    if (aboveLower && belowUpper) throw new MathError(`This sum divides by zero at ${index} = ${root}.`);
  }
}

/**
 * Exact Σ_{index=lower}^{upper} term for a rational function of the index whose partial
 * fractions telescope; upper may be ∞. Null when the term isn't of that kind.
 * Throws MathError when a term divides by zero or the infinite sum diverges.
 */
export function telescopingSum(term: Expr, index: string, lower: Expr, upper: Expr): Expr | null {
  const fraction = toRationalFunction(term, index);
  if (!fraction || fraction.denominator.length < 2) return null;
  // A polynomial part would need Faulhaber sums too; closedFormSum covers plain polynomials.
  const { quotient, remainder } = dividePolynomials(fraction.numerator, fraction.denominator);
  if (quotient.length > 0) return null;
  const { linear, irreducible } = decomposePartialFractions(remainder, fraction.denominator);
  if (irreducible) return null;
  const chains = buildChains(linear);
  if (!chains) return null;
  assertNoPoleInRange(linear, index, lower, upper);

  const isInfinite = infinityDirection(upper) === 1;
  // For large n the term behaves like (Σ of all 1/(n - r) coefficients)/n.
  const harmonicWeight = linear.filter(({ power }) => power === 1).reduce((total, { coefficient }) => total.add(coefficient), Rational.ZERO);
  if (isInfinite && !harmonicWeight.isZero()) throw new MathError(`${DIVERGES_MESSAGE} (Its terms shrink like 1/${index}.)`);

  const pieces: Expr[] = [];
  for (const chain of chains) {
    pieces.push(boundaryTerms(chain, lower, isInfinite ? null : upper));
    const weight = chain.members.reduce((total, { coefficient }) => total.add(coefficient), Rational.ZERO);
    if (weight.isZero()) continue;
    const leftover = isInfinite ? leftoverInfiniteSum(chain, lower) : null;
    if (!leftover) return null;
    pieces.push(productOf(num(weight), leftover));
  }
  return sumOf(...pieces);
}
