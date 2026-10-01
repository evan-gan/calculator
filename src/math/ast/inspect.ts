import type { Expr } from './nodes';

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

export function containsVariable(expr: Expr, name?: string): boolean {
  if (expr.type === 'var') return name === undefined || expr.name === name;
  return children(expr).some((child) => containsVariable(child, name));
}

export function isConstantExpr(expr: Expr): boolean {
  return !containsVariable(expr);
}

/** Variable names in order of first appearance. */
export function collectVariables(expr: Expr, found: Set<string> = new Set()): string[] {
  if (expr.type === 'var') found.add(expr.name);
  for (const child of children(expr)) collectVariables(child, found);
  return [...found];
}

export function countOccurrences(expr: Expr, name: string): number {
  if (expr.type === 'var') return expr.name === name ? 1 : 0;
  return children(expr).reduce((total, child) => total + countOccurrences(child, name), 0);
}

/**
 * Canonical string for an expression. Because the simplifier sorts terms and factors,
 * two simplified expressions are equal exactly when their keys match.
 */
export function toKey(expr: Expr): string {
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

export function substituteVariable(expr: Expr, name: string, replacement: Expr): Expr {
  return replaceSubtree(expr, `$${name}`, replacement);
}
