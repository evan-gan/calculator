import { Rational } from '../../number/rational';
import {
  degreeOf,
  dividePolynomials,
  multiplyPolynomials,
  powerSeriesQuotient,
  scalePolynomial,
  shiftPolynomial,
  addPolynomials,
  subtractPolynomials,
  type RationalPolynomial,
} from '../../number/rationalPolynomial';
import { deflate, evaluatePolynomial, extractRationalRoots } from '../../solve/polynomial/rationalRoots';

// Partial fractions for N(x)/D(x) with deg N < deg D:
//   Σ c / (x - r)^k  over D's rational roots r,  plus  M(x)/Q(x)  for the factor Q of D that has
// no rational roots (a quadratic like x² + 1, or x⁴ + 1). Splitting Q further needs irrational
// coefficients; realFactors.ts and splitOverRealFactors.ts do that part.

export interface LinearFraction {
  root: Rational;
  power: number;
  coefficient: Rational;
}

export interface PartialFractions {
  linear: LinearFraction[];
  /** M(x)/Q(x) over the factor without rational roots, or null when every factor of D is linear. */
  irreducible: { numerator: RationalPolynomial; denominator: RationalPolynomial } | null;
}

export type RootWithMultiplicity = { root: Rational; multiplicity: number };

function deflateTimes(polynomial: RationalPolynomial, root: Rational, times: number): RationalPolynomial {
  let result = polynomial;
  for (let step = 0; step < times; step++) result = deflate(result, root);
  return result;
}

/** Rational roots of D with multiplicities, and what is left after dividing them out. */
export function factorRationalRoots(denominator: RationalPolynomial): { roots: RootWithMultiplicity[]; remaining: RationalPolynomial } {
  const roots: RootWithMultiplicity[] = [];
  // The rational root search needs a non-zero constant term, so pull out powers of x first.
  const zeroMultiplicity = denominator.findIndex((coefficient) => !coefficient.isZero());
  if (zeroMultiplicity > 0) roots.push({ root: Rational.ZERO, multiplicity: zeroMultiplicity });
  let remaining = denominator.slice(zeroMultiplicity);
  if (remaining.length <= 1) return { roots, remaining };
  for (const root of extractRationalRoots(remaining).roots) {
    let multiplicity = 0;
    while (remaining.length > 1 && evaluatePolynomial(remaining, root).isZero()) {
      remaining = deflate(remaining, root);
      multiplicity++;
    }
    roots.push({ root, multiplicity });
  }
  return { roots, remaining };
}

/**
 * Coefficients of 1/(x - r)^k for k = m..1 at a root of multiplicity m: they are the first m
 * Taylor coefficients of N(x)/S(x) around r, where D = (x - r)^m · S.
 */
function fractionsAtRoot(numerator: RationalPolynomial, denominator: RationalPolynomial, { root, multiplicity }: RootWithMultiplicity): LinearFraction[] {
  const cofactor = deflateTimes(denominator, root, multiplicity);
  const taylor = powerSeriesQuotient(shiftPolynomial(numerator, root), shiftPolynomial(cofactor, root), multiplicity);
  return taylor
    .map((coefficient, index) => ({ root, power: multiplicity - index, coefficient }))
    .filter((fraction) => !fraction.coefficient.isZero());
}

/** (x - r)^m multiplied out for every root. */
function monicRootProduct(roots: RootWithMultiplicity[]): RationalPolynomial {
  return roots.reduce(
    (product, { root, multiplicity }) => {
      let result = product;
      for (let step = 0; step < multiplicity; step++) result = multiplyPolynomials(result, [root.neg(), Rational.ONE]);
      return result;
    },
    [Rational.ONE] as RationalPolynomial,
  );
}

/** Split N/D into partial fractions over D's rational roots, plus the part over what remains. */
export function decomposePartialFractions(numerator: RationalPolynomial, denominator: RationalPolynomial): PartialFractions {
  const { roots, remaining } = factorRationalRoots(denominator);
  const linear = roots.flatMap((root) => fractionsAtRoot(numerator, denominator, root));
  if (degreeOf(remaining) < 1) return { linear, irreducible: null };

  // Whatever the linear fractions don't account for sits over the remaining factor:
  // (N - Σ c·D/(x - r)^k) / Π(x - r)^m = M(x).
  const linearNumerator = linear.reduce(
    (total, { root, power, coefficient }) => addPolynomials(total, scalePolynomial(deflateTimes(denominator, root, power), coefficient)),
    [] as RationalPolynomial,
  );
  const { quotient, remainder } = dividePolynomials(subtractPolynomials(numerator, linearNumerator), monicRootProduct(roots));
  if (remainder.length > 0) throw new Error('Partial fraction decomposition left a remainder');
  return { linear, irreducible: { numerator: quotient, denominator: remaining } };
}
