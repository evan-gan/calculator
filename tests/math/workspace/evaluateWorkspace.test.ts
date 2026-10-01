import { describe, expect, test } from 'vitest';
import { evaluateWorkspace, type LineResult } from '../../../src/math';

/** The exact text a line shows: its first exact line, its value, or its error. */
function shown(line: LineResult): string {
  const { result } = line;
  switch (result.kind) {
    case 'solved':
      return [...result.solutions.exactLines, ...result.solutions.notes].join(' | ');
    case 'value':
    case 'simplified':
      return result.result.exact;
    case 'error':
      return `error: ${result.message}`;
    case 'truth':
      return result.isTrue ? 'true' : 'false';
    case 'empty':
      return '';
  }
}

const run = (...lines: string[]) => evaluateWorkspace(lines).map(shown);

describe('variables shared between lines', () => {
  test('a solved variable can be used by another line', () => {
    expect(run('2x=6', 'x^{2}+1')).toEqual(['x=3', '=10']);
  });

  test('order does not matter: a line can use a variable defined further down', () => {
    expect(run('y+1', 'y=2x', 'x=\\sqrt{2}')).toEqual(['=1+2 \\sqrt{2}', 'y=2 \\sqrt{2}', 'x=\\sqrt{2}']);
  });

  test('a definition lower down makes an equation above solvable', () => {
    expect(run('x+y=10', '3y=12')).toEqual(['x=6', 'y=4']);
  });

  test('reports which variable each line defines', () => {
    expect(evaluateWorkspace(['a=5', 'a+1', '2b=a']).map((line) => line.defines)).toEqual(['a', null, 'b']);
  });

  test('a definition may keep free variables, which other lines then carry along', () => {
    expect(run('y=2t', 'y+1')).toEqual(['y=2 t', '=2 t+1']);
  });

  test('an equation whose variables are all defined elsewhere is checked instead of solved', () => {
    expect(run('x=3', 'x^{2}=9', 'x^{2}=8')).toEqual(['x=3', 'true', 'false']);
  });
});

describe('errors between lines', () => {
  test('circular definitions are reported on every line in the loop', () => {
    expect(run('a=b+1', 'b=2a')).toEqual([
      'error: Circular definition: a → b → a.',
      'error: Circular definition: a → b → a.',
    ]);
  });

  test('a line using a variable from a loop explains why it cannot be used', () => {
    const results = run('a=b', 'b=a', 'a+1');
    expect(results[2]).toMatch(/^error: Can't use a: Circular definition/);
  });

  test('a loop through a solved equation is also detected', () => {
    expect(run('x+y=3', 'y=2x')[1]).toMatch(/Circular definition/);
  });

  test('defining the same variable twice is an error on both lines', () => {
    expect(run('x=1', 'x=2')).toEqual([
      'error: x is defined in more than one line.',
      'error: x is defined in more than one line.',
    ]);
  });

  test('a variable with two solutions cannot be used as a single value', () => {
    const results = run('x^{2}=4', 'x+1');
    expect(results[0]).toBe('x=\\pm 2');
    expect(results[1]).toBe("error: Can't use x: x has 2 solutions, so other lines can't use it as one value.");
  });

  test('two unknowns with no other definitions still asks for one unknown', () => {
    expect(run('x+y=1')[0]).toMatch(/one unknown at a time/);
  });

  test('a syntax error on one line does not affect the others', () => {
    expect(run('2+', 'x=4', 'x')).toEqual(['error: The expression ends too early. Something is missing at the end.', 'x=4', '=4']);
  });
});
