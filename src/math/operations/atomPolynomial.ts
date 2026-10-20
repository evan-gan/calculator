import { toKey } from '../ast/inspect';
import { num, pow, type Expr } from '../ast/nodes';
import { gcdBig, lcmBig } from '../number/integer';
import { Rational } from '../number/rational';
import { simplifySum, splitCoefficient } from './add';
import { simplifyProduct } from './multiply';
import { simplifyPower } from './power';

// A sum read as a polynomial whose "variables" are atoms: any factor that isn't a
// rational number (m, sin θ, e^x, √2, (x+1)). Treating them as independent unknowns is
// always sound: an identity that holds for independent atoms holds for the real values too.
// It may miss identities between atoms (sin²θ + cos²θ = 1), which is fine for cancelling.

/** Atom key → integer exponent, e.g. m²g → { m: 2, g: 1 }. */
export type AtomPowers = Map<string, bigint>;

export interface AtomTerm {
  coefficient: Rational;
  powers: AtomPowers;
}

export interface AtomPolynomial {
  terms: AtomTerm[];
  /** Atom key → the atom's expression, so terms can be turned back into Expr. */
  atoms: Map<string, Expr>;
}

// Exact division of bigger sums is slow and its results rarely fit on screen.
const MAX_DIVISION_TERMS = 40;
const MAX_DIVISION_STEPS = 200;

/**
 * Split one factor into an atom and an integer exponent.
 * x³ → (x, 3), (x+1)⁻² → (x+1, -2), x^(-3/2) → (√x, -3), e^(-x) → (e^x, -1) so it can cancel against e^x.
 */
export function splitAtomPower(factor: Expr): { atom: Expr; exponent: bigint } {
  if (factor.type !== 'pow') return { atom: factor, exponent: 1n };
  const { base, exponent } = factor;
  if (exponent.type === 'num') {
    const { numerator, denominator } = exponent.value;
    if (denominator === 1n) return { atom: base, exponent: numerator };
    // x^(3/2) = (√x)³, so √x terms can cancel against x^(-1/2)
    return { atom: pow(base, num(new Rational(1n, denominator))), exponent: numerator };
  }
  if (splitCoefficient(exponent).coefficient.isNegative()) {
    return { atom: simplifyPower(base, simplifyProduct([num(-1), exponent])), exponent: -1n };
  }
  return { atom: factor, exponent: 1n };
}

/** Read a simplified term (3m²g) as a rational coefficient times atom powers. */
export function readAtomTerm(term: Expr, atoms: Map<string, Expr>): AtomTerm {
  const { coefficient, rest } = splitCoefficient(term);
  const powers: AtomPowers = new Map();
  for (const factor of rest) {
    const { atom, exponent } = splitAtomPower(factor);
    const key = toKey(atom);
    atoms.set(key, atom);
    addPower(powers, key, exponent);
  }
  return { coefficient, powers };
}

export function readAtomPolynomial(terms: Expr[]): AtomPolynomial {
  const atoms = new Map<string, Expr>();
  return { terms: terms.map((term) => readAtomTerm(term, atoms)), atoms };
}

function addPower(powers: AtomPowers, key: string, exponent: bigint): void {
  const total = (powers.get(key) ?? 0n) + exponent;
  if (total === 0n) powers.delete(key);
  else powers.set(key, total);
}

export function atomTermToExpr(term: AtomTerm, atoms: Map<string, Expr>): Expr {
  const factors = [...term.powers].map(([key, exponent]) => simplifyPower(atoms.get(key)!, num(exponent)));
  return simplifyProduct([num(term.coefficient), ...factors]);
}

export function atomPolynomialToExpr(polynomial: AtomPolynomial): Expr {
  return simplifySum(polynomial.terms.map((term) => atomTermToExpr(term, polynomial.atoms)));
}

/**
 * The largest monomial dividing every term: gcd of the coefficients times each atom
 * that appears in every term with the same sign of exponent (m in mg sin θ − ma, 1/b in a/b + c/b).
 * Its sign makes the first term of what's left positive, so x − 1 and 1 − x share a form.
 */
export function atomContent(polynomial: AtomPolynomial): AtomTerm {
  const [first, ...others] = polynomial.terms;
  let numeratorGcd = 0n;
  let denominatorLcm = 1n;
  for (const { coefficient } of polynomial.terms) {
    numeratorGcd = gcdBig(numeratorGcd, coefficient.numerator);
    denominatorLcm = lcmBig(denominatorLcm, coefficient.denominator);
  }
  const sign = first.coefficient.isNegative() ? -1n : 1n;
  const powers: AtomPowers = new Map();
  for (const [key, firstExponent] of first.powers) {
    let shared = firstExponent;
    for (const term of others) {
      const exponent = term.powers.get(key) ?? 0n;
      if (exponent === 0n || exponent > 0n !== firstExponent > 0n) {
        shared = 0n;
        break;
      }
      // Closest to zero: the smallest positive power, or the largest negative one.
      if (exponent > 0n ? exponent < shared : exponent > shared) shared = exponent;
    }
    if (shared !== 0n) powers.set(key, shared);
  }
  return { coefficient: new Rational(sign * numeratorGcd, denominatorLcm), powers };
}

export function divideTermByTerm(dividend: AtomTerm, divisor: AtomTerm): AtomTerm {
  const powers = new Map(dividend.powers);
  for (const [key, exponent] of divisor.powers) addPower(powers, key, -exponent);
  return { coefficient: dividend.coefficient.div(divisor.coefficient), powers };
}

/**
 * Exact polynomial division dividend / divisor over the atoms, or null when it leaves a remainder.
 * Uses lexicographic order: if the divisor divides exactly, its leading term always divides
 * the dividend's leading term, so the first failure proves there is a remainder.
 */
export function divideExactly(dividend: AtomPolynomial, divisor: AtomPolynomial): AtomPolynomial | null {
  if (dividend.terms.length > MAX_DIVISION_TERMS || divisor.terms.length > MAX_DIVISION_TERMS) return null;
  if (![...dividend.terms, ...divisor.terms].every(hasNoNegativePowers)) return null;
  const atoms = new Map([...dividend.atoms, ...divisor.atoms]);
  const keyOrder = [...atoms.keys()].sort();
  const divisorTerms = sortTerms(divisor.terms, keyOrder);
  const divisorLead = divisorTerms[0];
  let remainder = sortTerms(dividend.terms, keyOrder);
  const quotient: AtomTerm[] = [];

  for (let step = 0; step < MAX_DIVISION_STEPS; step++) {
    if (remainder.length === 0) return { terms: quotient, atoms };
    const quotientTerm = divideTermByTerm(remainder[0], divisorLead);
    if (!hasNoNegativePowers(quotientTerm)) return null;
    quotient.push(quotientTerm);
    const subtracted = divisorTerms.map((term) => multiplyTerms(term, quotientTerm, Rational.MINUS_ONE));
    remainder = sortTerms(combineLikeTerms([...remainder, ...subtracted]), keyOrder);
  }
  return null;
}

function hasNoNegativePowers(term: AtomTerm): boolean {
  return [...term.powers.values()].every((exponent) => exponent > 0n);
}

function multiplyTerms(first: AtomTerm, second: AtomTerm, scale: Rational): AtomTerm {
  const powers = new Map(first.powers);
  for (const [key, exponent] of second.powers) addPower(powers, key, exponent);
  return { coefficient: first.coefficient.mul(second.coefficient).mul(scale), powers };
}

function powersKey(powers: AtomPowers): string {
  return [...powers]
    .sort(([first], [second]) => (first < second ? -1 : 1))
    .map(([key, exponent]) => `${key}^${exponent}`)
    .join('*');
}

function combineLikeTerms(terms: AtomTerm[]): AtomTerm[] {
  const combined = new Map<string, AtomTerm>();
  for (const term of terms) {
    const key = powersKey(term.powers);
    const existing = combined.get(key);
    combined.set(key, existing ? { ...existing, coefficient: existing.coefficient.add(term.coefficient) } : term);
  }
  return [...combined.values()].filter((term) => !term.coefficient.isZero());
}

/** Highest term first in lexicographic order of the atoms' exponents. */
function sortTerms(terms: AtomTerm[], keyOrder: string[]): AtomTerm[] {
  const compare = (first: AtomTerm, second: AtomTerm): number => {
    for (const key of keyOrder) {
      const difference = (second.powers.get(key) ?? 0n) - (first.powers.get(key) ?? 0n);
      if (difference !== 0n) return difference > 0n ? 1 : -1;
    }
    return 0;
  };
  return [...terms].sort(compare);
}
