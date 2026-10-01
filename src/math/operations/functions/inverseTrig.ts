import { isConstantExpr, toKey } from '../../ast/inspect';
import { divide, func, mul, negate, num, PI, type Expr, type FunctionName } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate } from '../../evaluate/evaluate';
import { Rational } from '../../number/rational';
import { simplify } from '../../simplify/simplify';
import { negated } from '../arithmetic';
import { hasNegativeSign } from '../sign';
import { exactCosine, exactSine, TABLE_ANGLES } from './trigTable';
import type { FunctionDefinition } from './types';

// Inverse trig works backwards through the exact table: arcsin(√3/2) = π/3.
// Lookups are keyed by the canonical form of each simplified table value.

let sineLookup: Map<string, Rational> | null = null;
let tangentLookup: Map<string, Rational> | null = null;

function buildLookup(valueAt: (angle: Rational) => Expr | null, includeRightAngle: boolean): Map<string, Rational> {
  const lookup = new Map<string, Rational>();
  for (const angle of TABLE_ANGLES) {
    if (!includeRightAngle && angle.equals(Rational.HALF)) continue;
    const value = valueAt(angle);
    if (value) lookup.set(toKey(simplify(value)), angle);
  }
  return lookup;
}

function tangentAt(angle: Rational): Expr | null {
  const sine = exactSine(angle);
  const cosine = exactCosine(angle);
  return sine && cosine ? divide(sine, cosine) : null;
}

/** Angle r in [-1/2, 1/2] (multiple of π) whose sine is `value`, or null if not in the table. */
function signedSineAngle(value: Expr): Rational | null {
  sineLookup ??= buildLookup(exactSine, true);
  if (hasNegativeSign(value)) {
    const angle = sineLookup.get(toKey(negated(value)));
    return angle ? angle.neg() : null;
  }
  return sineLookup.get(toKey(value)) ?? null;
}

function piTimes(multiple: Rational): Expr {
  return mul(num(multiple), PI);
}

function assertUnitInterval(name: FunctionName, value: Expr): void {
  if (isConstantExpr(value) && Math.abs(evaluate(value)) > 1 + 1e-12) {
    throw new MathError(`${name} is only defined for inputs between -1 and 1.`);
  }
}

export const arcsinDefinition: FunctionDefinition = {
  name: 'arcsin',
  latex: '\\arcsin',
  arity: 1,
  simplify: ([value]) => {
    assertUnitInterval('arcsin', value);
    const angle = signedSineAngle(value);
    if (angle) return piTimes(angle);
    return hasNegativeSign(value) ? negate(func('arcsin', negated(value))) : null;
  },
  evaluate: ([value]) => Math.asin(value),
};

export const arccosDefinition: FunctionDefinition = {
  name: 'arccos',
  latex: '\\arccos',
  arity: 1,
  simplify: ([value]) => {
    assertUnitInterval('arccos', value);
    // arccos(v) = π/2 - arcsin(v)
    const angle = signedSineAngle(value);
    return angle ? piTimes(Rational.HALF.sub(angle)) : null;
  },
  evaluate: ([value]) => Math.acos(value),
};

export const arctanDefinition: FunctionDefinition = {
  name: 'arctan',
  latex: '\\arctan',
  arity: 1,
  simplify: ([value]) => {
    tangentLookup ??= buildLookup(tangentAt, false);
    const isNegative = hasNegativeSign(value);
    const angle = tangentLookup.get(toKey(isNegative ? negated(value) : value));
    if (angle) return piTimes(isNegative ? angle.neg() : angle);
    return isNegative ? negate(func('arctan', negated(value))) : null;
  },
  evaluate: ([value]) => Math.atan(value),
};
