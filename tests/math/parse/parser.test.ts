import { describe, expect, test } from 'vitest';
import { parseLatex } from '../../../src/math/parse/parser';
import { evaluate } from '../../../src/math/evaluate/evaluate';
import { parseExpr } from '../../helpers';

// Parsing is checked by evaluating the raw tree, which tests precedence without depending on the simplifier.
const valueOf = (latex: string, x = 2) => evaluate(parseExpr(latex), { x });

describe('parser precedence and structure', () => {
  test.each([
    ['1+2\\cdot3', 7],
    ['2^{3^{2}}', 512],
    ['-x^{2}', -4],
    ['2x^{2}', 8],
    ['\\frac{1}{2}x', 1],
    ['\\frac{x+1}{x-1}', 3],
    ['\\sqrt{x+2}', 2],
    ['\\sqrt[3]{x+6}', 2],
    ['3!', 6],
    ['\\left|1-x\\right|', 1],
    ['|1-x|', 1],
    ['2\\left(x+1\\right)\\left(x-1\\right)', 6],
    ['\\log_{2}8', 3],
    ['\\log100', 2],
    ['\\ln e', 1],
    ['10\\div4', 2.5],
  ])('%s evaluates to %d at x = 2', (latex, expected) => {
    expect(valueOf(latex)).toBeCloseTo(expected, 12);
  });

  test('function arguments without parentheses take the implicit product: \\sin 2x = sin(2x)', () => {
    expect(valueOf('\\sin 2x', 0.3)).toBeCloseTo(Math.sin(0.6), 12);
  });

  test('\\sin^{2}x is (sin x)^2 and \\sin^{-1}x is arcsin x', () => {
    expect(valueOf('\\sin^{2}x', 0.3)).toBeCloseTo(Math.sin(0.3) ** 2, 12);
    expect(valueOf('\\sin^{-1}\\left(x\\right)', 0.3)).toBeCloseTo(Math.asin(0.3), 12);
  });

  test('implicit multiplication between adjacent functions: \\sin x\\cos x', () => {
    expect(valueOf('\\sin x\\cos x', 0.3)).toBeCloseTo(Math.sin(0.3) * Math.cos(0.3), 12);
  });

  test('an equals sign produces an equation statement', () => {
    expect(parseLatex('2x=4').kind).toBe('equation');
    expect(parseLatex('2x+4').kind).toBe('expression');
  });
});

describe('percent', () => {
  test('50% is one half, and \\% from MathQuill works too', () => {
    expect(valueOf('50%')).toBeCloseTo(0.5, 12);
    expect(valueOf('20\\%\\cdot x')).toBeCloseTo(0.4, 12);
  });
});
