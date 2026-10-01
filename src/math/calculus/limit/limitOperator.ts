import { INFINITY, infinityDirection, limit, readLimit } from '../../ast/calculus';
import { collectVariables, containsVariable, toKey } from '../../ast/inspect';
import { negate, type Expr, type FunctionNode } from '../../ast/nodes';
import { MathError } from '../../errors';
import { evaluate, type VariableValues } from '../../evaluate/evaluate';
import { simplify } from '../../simplify/simplify';
import { findLimit } from './findLimit';
import { isDefinedNear, numericLimit, pointAtDistance } from './numericLimit';
import { pointValue } from './probe';
import type { Approach, LimitResult } from './types';

// lim_{x→a} f(x). Each side is worked out exactly by findLimit and, when f has no other
// variables, checked against a numeric estimate (a disagreement means a rule misfired, so the
// exact answer is dropped). Sides that disagree, or oscillation, mean the limit doesn't exist.
// Without an exact answer the limit stays unevaluated and displays as ≈ its numeric value.

// findLimit calls allowed per side; L'Hôpital on awkward expressions can otherwise branch a lot.
const CALL_BUDGET = 1000;
// How closely an exact answer must match the numeric estimate. Loose on purpose: the check is
// there to catch a rule that misfired (which is off by a lot), not to doubt correct answers.
const CONFIRMATION = 1e-4;
// How closely the two sides' estimates must agree for an unevaluated limit to have a value.
const AGREEMENT = 1e-6;

type SideOutcome = LimitResult | { kind: 'undefined' };

function approachesFor(variable: string, point: Expr, side: -1 | 0 | 1): Approach[] {
  const direction = infinityDirection(point);
  if (direction !== 0) return [{ variable, point: null, direction }];
  if (side !== 0) return [{ variable, point, direction: side }];
  return [
    { variable, point, direction: -1 },
    { variable, point, direction: 1 },
  ];
}

function sampler(body: Expr, variable: string): (x: number) => number {
  return (x) => evaluate(body, { [variable]: x });
}

/** Drop an exact result the numbers contradict (a finite value off by too much, or the wrong sign of ∞). */
function confirmed(result: LimitResult, body: Expr, approach: Approach): LimitResult {
  const f = sampler(body, approach.variable);
  const point = pointValue(approach);
  if (result.kind === 'finite') {
    const estimate = numericLimit(f, point, approach.direction);
    if (estimate === null) return result;
    const exact = evaluate(result.value);
    return Math.abs(exact - estimate) <= CONFIRMATION * Math.max(1, Math.abs(estimate)) ? result : { kind: 'unknown' };
  }
  if (result.kind === 'infinite') {
    // A finite numeric estimate, or the wrong sign next to the point, contradicts ±∞.
    const nearby = f(pointAtDistance(point, approach.direction, 1e-8));
    const estimate = numericLimit(f, point, approach.direction);
    const contradicted = Math.sign(nearby) !== result.sign || (estimate !== null && Number.isFinite(estimate));
    return contradicted ? { kind: 'unknown' } : result;
  }
  return result;
}

function limitFromSide(body: Expr, approach: Approach, canProbe: boolean): SideOutcome {
  if (canProbe && !isDefinedNear(sampler(body, approach.variable), pointValue(approach), approach.direction)) return { kind: 'undefined' };
  const result = findLimit(body, { approach, budget: { remaining: CALL_BUDGET }, canProbe, rewrites: 0 });
  return canProbe ? confirmed(result, body, approach) : result;
}

/** A short plain-text form of a side's value for error messages. */
function describeSide(result: LimitResult): string {
  if (result.kind === 'infinite') return result.sign === 1 ? '∞' : '-∞';
  if (result.kind === 'finite') return String(Number(evaluate(result.value).toPrecision(6)));
  return 'no value';
}

const sameLimit = (first: LimitResult, second: LimitResult) =>
  (first.kind === 'infinite' && second.kind === 'infinite' && first.sign === second.sign) ||
  (first.kind === 'finite' && second.kind === 'finite' && (toKey(first.value) === toKey(second.value) || evaluate(first.value) === evaluate(second.value)));

function asExpr(result: LimitResult): Expr {
  if (result.kind === 'finite') return result.value;
  return result.kind === 'infinite' && result.sign === -1 ? negate(INFINITY) : INFINITY;
}

/** When no exact answer was found: keep the limit unevaluated if the numbers settle, else explain. */
function numericFallback(body: Expr, approaches: Approach[], unevaluated: Expr): Expr {
  const estimates = approaches.map((approach) => numericLimit(sampler(body, approach.variable), pointValue(approach), approach.direction));
  if (estimates.some((estimate) => estimate === null)) throw new MathError("Couldn't find this limit. It may not exist.");
  const values = estimates as number[];
  const describeValue = (value: number) => (Number.isFinite(value) ? String(Number(value.toPrecision(6))) : value > 0 ? '∞' : '-∞');
  const agree = values.every((value) => value === values[0] || Math.abs(value - values[0]) <= AGREEMENT * Math.max(1, Math.abs(values[0])));
  if (!agree) {
    throw new MathError(`This limit doesn't exist: it approaches ${describeValue(values[0])} from the left but ${describeValue(values[1])} from the right.`);
  }
  if (!Number.isFinite(values[0])) throw new MathError(`This limit seems to be ${describeValue(values[0])}, but that couldn't be confirmed exactly.`);
  return unevaluated;
}

function combineSides(outcomes: SideOutcome[], approaches: Approach[], body: Expr, unevaluated: Expr, canProbe: boolean): Expr {
  const defined = outcomes.flatMap((outcome, index) => (outcome.kind === 'undefined' ? [] : [{ result: outcome, approach: approaches[index] }]));
  if (defined.length === 0) throw new MathError("This limit doesn't exist: the expression isn't defined next to that point.");
  const results = defined.map(({ result }) => result);
  if (results.some((result) => result.kind === 'bounded')) throw new MathError("This limit doesn't exist: the expression keeps oscillating.");
  if (results.some((result) => result.kind === 'unknown')) {
    return canProbe ? numericFallback(body, defined.map(({ approach }) => approach), unevaluated) : unevaluated;
  }
  if (results.every((result) => sameLimit(result, results[0]))) return asExpr(results[0]);
  throw new MathError(`This limit doesn't exist: it approaches ${describeSide(results[0])} from the left but ${describeSide(results[1])} from the right.`);
}

/** Simplify a lim node: an exact value (possibly ±∞), the unevaluated limit, or a MathError saying why there's none. */
export function simplifyLimit(call: FunctionNode): Expr {
  const { body, variable, point, side } = readLimit(call);
  const simplifiedBody = simplify(body);
  const target = simplify(point);
  if (!containsVariable(simplifiedBody, variable)) return simplifiedBody;
  const unevaluated = limit(simplifiedBody, variable, target, side);
  // Numeric checks need every other symbol to have a value.
  const canProbe = collectVariables(simplifiedBody).every((name) => name === variable) && !containsVariable(target);
  if (infinityDirection(target) === 0 && canProbe && !Number.isFinite(evaluate(target))) {
    throw new MathError('A limit has to approach a number or ±∞.');
  }
  const approaches = approachesFor(variable, target, side);
  const outcomes = approaches.map((approach) => limitFromSide(simplifiedBody, approach, canProbe));
  return combineSides(outcomes, approaches, simplifiedBody, unevaluated, canProbe);
}

/** Float value of an unevaluated lim node (NaN when the sides disagree or don't settle). */
export function evaluateLimit(call: FunctionNode, values: VariableValues): number {
  const { body, variable, point, side } = readLimit(call);
  const target = evaluate(point, values);
  const f = (x: number) => evaluate(body, { ...values, [variable]: x });
  // Towards ±∞ the direction is the sign of ∞ (see Approach).
  const directions: (1 | -1)[] = !Number.isFinite(target) ? [target > 0 ? 1 : -1] : side !== 0 ? [side] : [-1, 1];
  const estimates = directions.map((direction) => numericLimit(f, target, direction));
  if (estimates.some((estimate) => estimate === null)) return NaN;
  const [first, second] = estimates as number[];
  return second === undefined || Math.abs(first - second) <= AGREEMENT * Math.max(1, Math.abs(first)) ? first : NaN;
}
