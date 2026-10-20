import { boundVariableOf, isCalculusOperator } from './calculus';
import type { Expr, FunctionNode } from './nodes';

// Read-only queries over expression trees.

export function children(expr: Expr): Expr[] {
  switch (expr.type) {
    case 'add':
      return expr.terms;
    case 'mul':
      return expr.factors;
    case 'pow':
      return [expr.base, expr.exponent];
    case 'func':
      return expr.args;
    default:
      return [];
  }
}

/** A child expression and the variable (if any) that is local inside it. */
type ScopedChild = { child: Expr; hidden: string | null };

/**
 * Children as seen by variable lookups. A calculus operator's variable marker is skipped, and
 * inside a sum or definite integral its variable is local: Σ_{n=1}^{3} n doesn't depend on n.
 */
function scopedChildren(expr: Expr): ScopedChild[] {
  if (expr.type !== 'func' || !isCalculusOperator(expr.name)) return children(expr).map((child) => ({ child, hidden: null }));
  const bound = boundVariableOf(expr);
  const [body, marker, ...rest] = expr.args;
  // A free marker still counts: ∫ 5 dx = 5x depends on x even though the body doesn't.
  const markerChildren = bound === null ? [{ child: marker, hidden: null }] : [];
  return [{ child: body, hidden: bound }, ...markerChildren, ...rest.map((child) => ({ child, hidden: null }))];
}

/** Calls `visit` for each free variable occurrence; stops early once `visit` returns true. */
function visitFreeVariables(expr: Expr, hidden: Set<string>, visit: (name: string) => boolean | void): boolean {
  if (expr.type === 'var') return !hidden.has(expr.name) && visit(expr.name) === true;
  for (const { child, hidden: local } of scopedChildren(expr)) {
    const hidesNew = local !== null && !hidden.has(local);
    if (hidesNew) hidden.add(local);
    const stop = visitFreeVariables(child, hidden, visit);
    if (hidesNew) hidden.delete(local);
    if (stop) return true;
  }
  return false;
}

/** True if the expression depends on `name` (or on any variable when no name is given). */
export function containsVariable(expr: Expr, name?: string): boolean {
  if (expr.type === 'num' || expr.type === 'const') return false;
  return visitFreeVariables(expr, new Set(), (variableName) => name === undefined || variableName === name);
}

export function isConstantExpr(expr: Expr): boolean {
  return !containsVariable(expr);
}

/** Free variable names in order of first appearance (variables local to a sum or integral are skipped). */
export function collectVariables(expr: Expr, found: Set<string> = new Set()): string[] {
  visitFreeVariables(expr, new Set(), (name) => {
    found.add(name);
  });
  return [...found];
}

export function countOccurrences(expr: Expr, name: string): number {
  let count = 0;
  visitFreeVariables(expr, new Set(), (variableName) => {
    if (variableName === name) count++;
  });
  return count;
}

// Expr nodes are never mutated, so a node's key can be remembered. The simplifier asks for
// the same keys over and over (grouping like terms, merging powers, cancelling factors).
const keyCache = new WeakMap<Expr, string>();

/**
 * Canonical string for an expression. Because the simplifier sorts terms and factors,
 * two simplified expressions are equal exactly when their keys match.
 */
export function toKey(expr: Expr): string {
  const cached = keyCache.get(expr);
  if (cached !== undefined) return cached;
  const key = buildKey(expr);
  keyCache.set(expr, key);
  return key;
}

function buildKey(expr: Expr): string {
  switch (expr.type) {
    case 'num':
      return expr.value.toString();
    case 'const':
      return `#${expr.name}`;
    case 'var':
      return `$${expr.name}`;
    case 'add':
      return `+(${expr.terms.map(toKey).join(',')})`;
    case 'mul':
      return `*(${expr.factors.map(toKey).join(',')})`;
    case 'pow':
      return `^(${toKey(expr.base)},${toKey(expr.exponent)})`;
    case 'func':
      return `${expr.name}(${expr.args.map(toKey).join(',')})`;
  }
}

export function exprEquals(first: Expr, second: Expr): boolean {
  return toKey(first) === toKey(second);
}

/** Replace every occurrence of a subtree (matched by key) with a replacement. */
export function replaceSubtree(expr: Expr, targetKey: string, replacement: Expr): Expr {
  if (toKey(expr) === targetKey) return replacement;
  switch (expr.type) {
    case 'add':
      return { type: 'add', terms: expr.terms.map((term) => replaceSubtree(term, targetKey, replacement)) };
    case 'mul':
      return { type: 'mul', factors: expr.factors.map((factor) => replaceSubtree(factor, targetKey, replacement)) };
    case 'pow':
      return {
        type: 'pow',
        base: replaceSubtree(expr.base, targetKey, replacement),
        exponent: replaceSubtree(expr.exponent, targetKey, replacement),
      };
    case 'func':
      return { ...expr, args: expr.args.map((arg) => replaceSubtree(arg, targetKey, replacement)) };
    default:
      return expr;
  }
}

/**
 * Replace the free variable `name` with a value. Local variables of sums and definite integrals
 * are left alone. A derivative in `name` is evaluated at the value instead (d/dx x² at x = 3),
 * and an indefinite integral in `name` keeps its variable, since plugging a number into it
 * has no meaning without its constant.
 */
export function substituteVariable(expr: Expr, name: string, replacement: Expr): Expr {
  switch (expr.type) {
    case 'var':
      return expr.name === name ? replacement : expr;
    case 'add':
      return { type: 'add', terms: expr.terms.map((term) => substituteVariable(term, name, replacement)) };
    case 'mul':
      return { type: 'mul', factors: expr.factors.map((factor) => substituteVariable(factor, name, replacement)) };
    case 'pow':
      return {
        type: 'pow',
        base: substituteVariable(expr.base, name, replacement),
        exponent: substituteVariable(expr.exponent, name, replacement),
      };
    case 'func':
      return substituteInCall(expr, name, replacement);
    default:
      return expr;
  }
}

function substituteInCall(call: FunctionNode, name: string, replacement: Expr): Expr {
  const substitute = (arg: Expr) => substituteVariable(arg, name, replacement);
  if (!isCalculusOperator(call.name)) return { ...call, args: call.args.map(substitute) };
  const [body, marker, ...rest] = call.args;
  const operatesOnName = marker.type === 'var' && marker.name === name;
  if (!operatesOnName) return { ...call, args: [substitute(body), marker, ...rest.map(substitute)] };
  if (boundVariableOf(call) === name) return { ...call, args: [body, marker, ...rest.map(substitute)] };
  if (call.name === 'derivative') return { ...call, args: [body, marker, rest[0], replacement] };
  return call;
}
