import { describe, expect, test } from 'vitest';
import { simplifyLatex } from '../../../helpers';

describe('factorial', () => {
  test('computes exact factorials', () => {
    expect(simplifyLatex('0!')).toBe('1');
    expect(simplifyLatex('5!')).toBe('120');
    expect(simplifyLatex('25!')).toBe('15511210043330985984000000');
  });

  test('rejects negative and fractional inputs', () => {
    expect(() => simplifyLatex('\\left(-1\\right)!')).toThrow('whole numbers');
    expect(() => simplifyLatex('\\left(\\frac{1}{2}\\right)!')).toThrow('whole numbers');
  });
});
