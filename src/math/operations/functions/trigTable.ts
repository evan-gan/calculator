import { add, divide, fraction, func, mul, negate, num, PI, sqrt, subtract, type Expr } from '../../ast/nodes';
import { Rational } from '../../number/rational';

// Exact values of sin(rπ) for r in [0, 1/2]. Every other angle that is a multiple of
// one of these reduces to the table through symmetry. Values are built as raw trees and
// simplified by the caller.
const SINE_TABLE: Record<string, () => Expr> = {
  '0': () => num(0),
  '1/12': () => divide(subtract(sqrt(num(6)), sqrt(num(2))), num(4)),
  '1/10': () => divide(subtract(sqrt(num(5)), num(1)), num(4)),
  '1/8': () => divide(sqrt(subtract(num(2), sqrt(num(2)))), num(2)),
  '1/6': () => fraction(1, 2),
  '1/5': () => divide(sqrt(subtract(num(10), mul(num(2), sqrt(num(5))))), num(4)),
  '1/4': () => divide(sqrt(num(2)), num(2)),
  '3/10': () => divide(add(num(1), sqrt(num(5))), num(4)),
  '1/3': () => divide(sqrt(num(3)), num(2)),
  '3/8': () => divide(sqrt(add(num(2), sqrt(num(2)))), num(2)),
  '2/5': () => divide(sqrt(add(num(10), mul(num(2), sqrt(num(5))))), num(4)),
  '5/12': () => divide(add(sqrt(num(6)), sqrt(num(2))), num(4)),
  '1/2': () => num(1),
};

/** Angles r (as multiples of π) in [0, 1/2] that have exact table values. */
export const TABLE_ANGLES: Rational[] = Object.keys(SINE_TABLE).map((key) => {
  const [numerator, denominator = '1'] = key.split('/');
  return new Rational(BigInt(numerator), BigInt(denominator));
});

/** If expr is r·π (or 0), return r; otherwise null. */
export function piMultiple(expr: Expr): Rational | null {
  if (expr.type === 'num' && expr.value.isZero()) return Rational.ZERO;
  if (expr.type === 'const' && expr.name === 'pi') return Rational.ONE;
  if (
    expr.type === 'mul' &&
    expr.factors.length === 2 &&
    expr.factors[0].type === 'num' &&
    expr.factors[1].type === 'const' &&
    expr.factors[1].name === 'pi'
  ) {
    return expr.factors[0].value;
  }
  return null;
}

type ReducedAngle = { sign: 1 | -1; angle: Rational };

/** Reduce r modulo `period` into [0, period). */
function reduceModulo(multipleOfPi: Rational, period: Rational): Rational {
  return multipleOfPi.sub(period.mul(Rational.fromInt(multipleOfPi.div(period).floor())));
}

/** sin(rπ) = sign·sin(angle·π) with angle in [0, 1/2]. */
function reduceSineAngle(multipleOfPi: Rational): ReducedAngle {
  let angle = reduceModulo(multipleOfPi, Rational.fromInt(2));
  let sign: 1 | -1 = 1;
  if (angle.compare(Rational.ONE) >= 0) {
    angle = angle.sub(Rational.ONE); // sin(π + θ) = -sin θ
    sign = -1;
  }
  if (angle.compare(Rational.HALF) > 0) angle = Rational.ONE.sub(angle); // sin(π - θ) = sin θ
  return { sign, angle };
}

/** cos(rπ) = sign·cos(angle·π) with angle in [0, 1/2]. */
function reduceCosineAngle(multipleOfPi: Rational): ReducedAngle {
  let angle = reduceModulo(multipleOfPi, Rational.fromInt(2));
  let sign: 1 | -1 = 1;
  if (angle.compare(Rational.ONE) > 0) angle = Rational.fromInt(2).sub(angle); // cos(2π - θ) = cos θ
  if (angle.compare(Rational.HALF) > 0) {
    angle = Rational.ONE.sub(angle); // cos(π - θ) = -cos θ
    sign = -1;
  }
  return { sign, angle };
}

function applySign(sign: 1 | -1, value: Expr): Expr {
  const isZero = value.type === 'num' && value.value.isZero();
  return sign < 0 && !isZero ? negate(value) : value;
}

/** Exact sin(rπ) as an unsimplified tree, or null if the angle isn't in the table. */
export function exactSine(multipleOfPi: Rational): Expr | null {
  const { sign, angle } = reduceSineAngle(multipleOfPi);
  const build = SINE_TABLE[angle.toString()];
  return build ? applySign(sign, build()) : null;
}

/** Exact cos(rπ), using cos(θ) = sin(π/2 - θ) once the angle is in [0, π/2]. */
export function exactCosine(multipleOfPi: Rational): Expr | null {
  const { sign, angle } = reduceCosineAngle(multipleOfPi);
  const build = SINE_TABLE[Rational.HALF.sub(angle).toString()];
  return build ? applySign(sign, build()) : null;
}

/**
 * For angles outside the table, rewrite into the first quadrant without losing exactness:
 * cos(10π/9) = -cos(π/9). Returns null when the angle is already reduced.
 */
export function reduceTrigCall(name: 'sin' | 'cos', multipleOfPi: Rational): Expr | null {
  const { sign, angle } = name === 'sin' ? reduceSineAngle(multipleOfPi) : reduceCosineAngle(multipleOfPi);
  if (sign === 1 && angle.equals(multipleOfPi)) return null;
  return applySign(sign, func(name, mul(num(angle), PI)));
}
