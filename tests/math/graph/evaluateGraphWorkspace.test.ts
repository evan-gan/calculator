import { describe, expect, test } from 'vitest';
import { evaluateGraphWorkspace } from '../../../src/math';
import { evaluate } from '../../../src/math/evaluate/evaluate';

describe('evaluateGraphWorkspace', () => {
  test('y = x² gives a plot and no text result', () => {
    const [line] = evaluateGraphWorkspace(['y=x^{2}']);
    expect(line.plot).toMatchObject({ kind: 'explicit', input: 'x' });
    expect(line.result).toEqual({ kind: 'empty' });
  });

  test('variables defined on other lines are substituted into the plot', () => {
    const [, graph] = evaluateGraphWorkspace(['a=2', 'y=ax+1']);
    expect(graph.plot).not.toBeNull();
    expect(evaluate(graph.plot!.expr, { x: 3 })).toBe(7);
  });

  test('order does not matter: the definition can come after the graph', () => {
    const [graph] = evaluateGraphWorkspace(['y=ax', 'a=3']);
    expect(evaluate(graph.plot!.expr, { x: 2 })).toBe(6);
  });

  test('a free variable is reported as an error and nothing is drawn', () => {
    const [line] = evaluateGraphWorkspace(['y=bx']);
    expect(line.plot).toBeNull();
    expect(line.result).toMatchObject({ kind: 'error' });
  });

  test('an expression in x keeps its scientific result (roots) and is graphed', () => {
    const [line] = evaluateGraphWorkspace(['x^{2}-4']);
    expect(line.plot).not.toBeNull();
    expect(line.result).toMatchObject({ kind: 'simplified', roots: { exactLines: ['x=\\pm 2'] } });
  });

  test('x = 3 is solved as text and drawn as a vertical line', () => {
    const [line] = evaluateGraphWorkspace(['x=3']);
    expect(line.result).toMatchObject({ kind: 'solved' });
    expect(line.plot).toMatchObject({ kind: 'explicit', along: 'vertical' });
  });

  test('lines without axis variables behave like the calculator', () => {
    const [sum, definition] = evaluateGraphWorkspace(['2+2', 'a=5']);
    expect(sum.result).toMatchObject({ kind: 'value', result: { exact: '=4' } });
    expect(sum.plot).toBeNull();
    expect(definition.defines).toBe('a');
  });

  test('x and y are never defined by a line', () => {
    const [definition, other] = evaluateGraphWorkspace(['y=2', 'x+y']);
    expect(definition.defines).toBeNull();
    expect(other.result).toMatchObject({ kind: 'simplified', result: { exact: '=x+y' } });
  });

  test('degree mode applies to graphs', () => {
    const [line] = evaluateGraphWorkspace(['y=\\sin x'], { angleMode: 'degrees' });
    expect(evaluate(line.plot!.expr, { x: 90 })).toBeCloseTo(1);
  });

  test('a syntax error is shown and nothing is drawn', () => {
    const [line] = evaluateGraphWorkspace(['y=x+']);
    expect(line.plot).toBeNull();
    expect(line.result).toMatchObject({ kind: 'error' });
  });
});
