import { toKey } from '../../ast/inspect';
import { add, divide, func, mul, num, pow, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';
import { linearParts } from './linear';
import type { IntegrationMethod } from './types';

// Powers and products of trig functions of one linear argument u = ax + b:
//   sinᵐ·cosⁿ with m or n odd: substitute w = cos u (or sin u), sin² = 1 - cos², integrate powers of w.
//   both even: cos² = 1 - sin², then the reduction formula for ∫ sinᵖ.
//   tanⁿ, cotⁿ, secⁿ, cscⁿ on their own: their reduction formulas.
// ∫ cos³x dx = sin x - sin³x/3,  ∫ sec³x dx = (sec x tan x + ln|sec x + tan x|)/2.

type TrigName = 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc';

const TRIG_NAMES = new Set<string>(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']);

// Each power step adds a term to the answer; past this the answer is unreadable anyway.
const MAX_POWER = 30;

type TrigPower = { name: TrigName; argument: Expr; power: number };

function readTrigPower(factor: Expr): TrigPower | null {
  if (factor.type === 'func' && TRIG_NAMES.has(factor.name)) return { name: factor.name as TrigName, argument: factor.args[0], power: 1 };
  if (factor.type !== 'pow' || factor.base.type !== 'func' || !TRIG_NAMES.has(factor.base.name)) return null;
  const exponent = factor.exponent;
  if (exponent.type !== 'num' || !exponent.value.isInteger() || exponent.value.abs().compare(Rational.fromInt(MAX_POWER)) > 0) return null;
  return { name: factor.base.name as TrigName, argument: factor.base.args[0], power: Number(exponent.value.numerator) };
}

/** Every factor as a trig power of the same argument, or null. */
function readTrigProduct(expr: Expr): TrigPower[] | null {
  const factors = expr.type === 'mul' ? expr.factors : [expr];
  const powers = factors.map(readTrigPower);
  if (powers.some((power) => power === null)) return null;
  const valid = powers as TrigPower[];
  const argumentKey = toKey(valid[0].argument);
  return valid.every((power) => toKey(power.argument) === argumentKey) ? valid : null;
}

const trig = (name: TrigName, u: Expr) => func(name, u);
const trigPower = (name: TrigName, u: Expr, power: number) => (power === 1 ? trig(name, u) : pow(trig(name, u), num(power)));
const lnAbs = (inner: Expr) => func('ln', func('abs', inner));
const ratio = (numerator: number, denominator: number) => num(new Rational(BigInt(numerator), BigInt(denominator)));

/**
 * ∫ fᵖ du for the reduction formulas that step p down by 2:
 * R(p) = boundary(p) + scale(p)·R(p - 2), from R(0) = u and R(1) = first.
 */
function reduce(power: number, u: Expr, first: Expr, boundary: (p: number) => Expr, scale: (p: number) => Expr): Expr {
  if (power === 0) return u;
  if (power === 1) return first;
  return add(boundary(power), mul(scale(power), reduce(power - 2, u, first, boundary, scale)));
}

/** ∫ fᵖ du for one trig function and p ≥ 0. */
function singlePowerAntiderivative(name: TrigName, u: Expr, power: number): Expr {
  const sameSign = (p: number) => ratio(p - 1, p);
  switch (name) {
    case 'sin':
      return reduce(power, u, mul(num(-1), trig('cos', u)), (p) => mul(ratio(-1, p), trigPower('sin', u, p - 1), trig('cos', u)), sameSign);
    case 'cos':
      return reduce(power, u, trig('sin', u), (p) => mul(ratio(1, p), trigPower('cos', u, p - 1), trig('sin', u)), sameSign);
    case 'tan':
      return reduce(power, u, mul(num(-1), lnAbs(trig('cos', u))), (p) => mul(ratio(1, p - 1), trigPower('tan', u, p - 1)), () => num(-1));
    case 'cot':
      return reduce(power, u, lnAbs(trig('sin', u)), (p) => mul(ratio(-1, p - 1), trigPower('cot', u, p - 1)), () => num(-1));
    case 'sec':
      return reduce(
        power,
        u,
        lnAbs(add(trig('sec', u), trig('tan', u))),
        (p) => mul(ratio(1, p - 1), trigPower('sec', u, p - 2), trig('tan', u)),
        (p) => ratio(p - 2, p - 1),
      );
    case 'csc':
      return reduce(
        power,
        u,
        mul(num(-1), lnAbs(add(trig('csc', u), trig('cot', u)))),
        (p) => mul(ratio(-1, p - 1), trigPower('csc', u, p - 2), trig('cot', u)),
        (p) => ratio(p - 2, p - 1),
      );
  }
}

function binomial(n: number, k: number): number {
  let result = 1;
  for (let step = 1; step <= k; step++) result = (result * (n - k + step)) / step;
  return result;
}

/** ∫ (1 - w²)^k · w^power dw, term by term (power may be negative): Σ C(k,j)(-1)^j w^(2j+power+1)/(2j+power+1). */
function integrateOneMinusSquare(half: number, power: number, w: Expr): Expr {
  const terms: Expr[] = [];
  for (let j = 0; j <= half; j++) {
    const coefficient = binomial(half, j) * (j % 2 === 0 ? 1 : -1);
    const raised = 2 * j + power + 1;
    terms.push(raised === 0 ? mul(num(coefficient), lnAbs(w)) : mul(ratio(coefficient, raised), pow(w, num(raised))));
  }
  return add(...terms);
}

/** ∫ sinᵐ(u)·cosⁿ(u) du with integer exponents, or null for the shapes not covered. */
function sinCosAntiderivative(sinPower: number, cosPower: number, u: Expr): Expr | null {
  // Odd sine power: sinᵐ cosⁿ du = -(1 - w²)^((m-1)/2)·wⁿ dw with w = cos u.
  if (sinPower > 0 && sinPower % 2 !== 0) return mul(num(-1), integrateOneMinusSquare((sinPower - 1) / 2, cosPower, trig('cos', u)));
  if (cosPower > 0 && cosPower % 2 !== 0) return integrateOneMinusSquare((cosPower - 1) / 2, sinPower, trig('sin', u));
  if (sinPower < 0 || cosPower < 0) return null;
  if (sinPower === 0) return singlePowerAntiderivative('cos', u, cosPower);
  if (cosPower === 0) return singlePowerAntiderivative('sin', u, sinPower);
  // Both even: cosⁿ = (1 - sin²)^(n/2), then ∫ sin^(m+2j) by reduction.
  const terms: Expr[] = [];
  for (let j = 0; j <= cosPower / 2; j++) {
    const coefficient = binomial(cosPower / 2, j) * (j % 2 === 0 ? 1 : -1);
    terms.push(mul(num(coefficient), singlePowerAntiderivative('sin', u, sinPower + 2 * j)));
  }
  return add(...terms);
}

function trigProductAntiderivative(powers: TrigPower[], u: Expr): Expr | null {
  // sin and cos go through sinCosAntiderivative, so odd powers get the substitution form (sin x - sin³x/3).
  const [only] = powers;
  if (powers.length === 1 && only.power > 0 && only.name !== 'sin' && only.name !== 'cos') {
    return singlePowerAntiderivative(only.name, u, only.power);
  }
  // Products with tan, sec... (sec x·tan x) read better from u-substitution, which keeps sec x as sec x.
  if (powers.some(({ name }) => name !== 'sin' && name !== 'cos')) return null;
  let [sinPower, cosPower] = [0, 0];
  for (const { name, power } of powers) {
    if (name === 'sin') sinPower += power;
    else cosPower += power;
  }
  // sin/cos products that collapse to one reciprocal function: cos⁻⁴ = sec⁴, sin²·cos⁻² = tan².
  if (sinPower === 0 && cosPower < 0) return singlePowerAntiderivative('sec', u, -cosPower);
  if (cosPower === 0 && sinPower < 0) return singlePowerAntiderivative('csc', u, -sinPower);
  if (sinPower === -cosPower && sinPower > 0) return singlePowerAntiderivative('tan', u, sinPower);
  if (sinPower === -cosPower && cosPower > 0) return singlePowerAntiderivative('cot', u, cosPower);
  return sinCosAntiderivative(sinPower, cosPower, u);
}

export const trigPowerMethod: IntegrationMethod = (expr, variable) => {
  const powers = readTrigProduct(expr);
  if (!powers) return null;
  const u = powers[0].argument;
  const linear = linearParts(u, variable);
  if (!linear) return null;
  const antiderivative = trigProductAntiderivative(powers, u);
  return antiderivative && divide(antiderivative, linear.slope);
};
