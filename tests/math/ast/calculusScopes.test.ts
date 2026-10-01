import { describe, expect, test } from 'vitest';
import { collectVariables, containsVariable, substituteVariable } from '../../../src/math/ast/inspect';
import { num } from '../../../src/math/ast/nodes';
import { parseExpr } from '../../helpers';

describe('variables inside calculus operators', () => {
  test('a sum index and a definite integration variable are local', () => {
    expect(collectVariables(parseExpr('\\sum _{n=1}^{k}n'))).toEqual(['k']);
    expect(collectVariables(parseExpr('\\int _0^1x\\,dx'))).toEqual([]);
    expect(containsVariable(parseExpr('\\int _0^ax\\,dx'), 'x')).toBe(false);
  });

  test('derivatives and indefinite integrals still depend on their variable', () => {
    expect(collectVariables(parseExpr('\\frac{d}{dx}x^{2}'))).toEqual(['x']);
    expect(collectVariables(parseExpr('\\int 5dx'))).toEqual(['x']);
  });

  test('substituting a sum index leaves the sum alone but fills in its limits', () => {
    const sum = parseExpr('\\sum _{n=1}^{n}n');
    const substituted = substituteVariable(sum, 'n', num(4));
    expect(substituted.type === 'func' && substituted.args[0]).toEqual(parseExpr('n'));
    expect(substituted.type === 'func' && substituted.args[3]).toEqual(num(4));
  });

  test('substituting into a derivative evaluates it at that point', () => {
    const substituted = substituteVariable(parseExpr('\\frac{d}{dx}x^{2}'), 'x', num(3));
    expect(substituted.type === 'func' && substituted.args).toHaveLength(4);
  });

  test("an indefinite integral's variable is never replaced", () => {
    const original = parseExpr('\\int x\\,dx');
    expect(substituteVariable(original, 'x', num(3))).toEqual(original);
  });
});
