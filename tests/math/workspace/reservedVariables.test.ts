import { describe, expect, test } from 'vitest';
import { evaluateWorkspace } from '../../../src/math';

describe('reserved variables (kept free for graphing)', () => {
  test('without reserving, y = 2 defines y for other lines', () => {
    const [, usesY] = evaluateWorkspace(['y=2', 'y+1']);
    expect(usesY.result).toMatchObject({ kind: 'value', result: { exact: '=3' } });
  });

  test('a reserved variable is never defined, so other lines keep it as a variable', () => {
    const [definition, usesY] = evaluateWorkspace(['y=2', 'y+1'], { reservedVariables: ['y'] });
    expect(definition.defines).toBeNull();
    expect(usesY.result).toMatchObject({ kind: 'simplified', result: { exact: '=y+1' } });
  });

  test('an equation mentioning a reserved variable does not solve for another variable', () => {
    const [line] = evaluateWorkspace(['y=ax'], { reservedVariables: ['x', 'y'] });
    expect(line.defines).toBeNull();
  });

  test('ordinary definitions still work alongside reserved variables', () => {
    const [definition] = evaluateWorkspace(['a=5'], { reservedVariables: ['x', 'y'] });
    expect(definition.defines).toBe('a');
  });
});
