import { describe, expect, test } from 'vitest';
import { customGridSteps, formatCoordinate, formatRangeValue, formatTick, gridSteps } from '../../../src/graphing/render/gridSteps';

describe('gridSteps: graph-paper spacing', () => {
  test('picks the smallest 1/2/5 × 10ⁿ step at least 90px apart', () => {
    // 0.025 units per pixel × 90px = 2.25 units → 5.
    expect(gridSteps(0.025)).toEqual({ major: 5, minor: 1 });
    expect(gridSteps(0.01)).toEqual({ major: 1, minor: 0.2 });
  });

  test('a step starting with 2 is split in four so minor lines land on whole numbers', () => {
    expect(gridSteps(0.02)).toEqual({ major: 2, minor: 0.5 });
  });

  test('works when zoomed far out and far in', () => {
    expect(gridSteps(1000).major).toBe(100000);
    expect(gridSteps(1e-6).major).toBeCloseTo(1e-4);
  });
});

describe('customGridSteps: a step typed in the settings', () => {
  test('a comfortably spaced step is labelled on every line', () => {
    // π at 0.025 units per pixel is ~126px apart.
    expect(customGridSteps(Math.PI, 0.025)?.major).toBeCloseTo(Math.PI);
  });

  test('when zoomed out, labels fall on every 2nd, 5th, 10th... line and the step stays as minor lines', () => {
    // 1 unit at 0.1 units per pixel is 10px: labels every 5 units (50px), minor lines every unit.
    expect(customGridSteps(1, 0.1)).toEqual({ major: 5, minor: 1 });
  });

  test('a step too dense to draw falls back to automatic spacing', () => {
    expect(customGridSteps(0.001, 1)).toBeNull();
    expect(customGridSteps(0, 1)).toBeNull();
    expect(customGridSteps(-2, 1)).toBeNull();
  });
});

describe('formatTick: axis labels', () => {
  test('labels of a non-decimal step (π) keep enough places to tell them apart', () => {
    expect(formatTick(2 * Math.PI, Math.PI)).toBe('6.283');
  });

  test('a step of 0.25 prints two decimals', () => {
    expect(formatTick(0.75, 0.25)).toBe('0.75');
  });

  test('removes float noise', () => {
    expect(formatTick(0.30000000000000004, 0.1)).toBe('0.3');
  });

  test('uses a typographic minus', () => {
    expect(formatTick(-5, 5)).toBe('−5');
  });

  test('values within half a step of zero print as 0', () => {
    expect(formatTick(1e-17, 0.1)).toBe('0');
  });

  test('large and tiny values use scientific notation', () => {
    expect(formatTick(2e6, 1e6)).toBe('2e6');
    expect(formatTick(3e-5, 1e-5)).toBe('3e−5');
  });
});

describe('formatCoordinate: traced point labels', () => {
  test('rounds to the zoom level and drops trailing zeros', () => {
    // 0.025 units per pixel → 3 decimals.
    expect(formatCoordinate(1.23456, 0.025)).toBe('1.235');
    expect(formatCoordinate(1.25, 0.025)).toBe('1.25');
    expect(formatCoordinate(3, 0.025)).toBe('3');
  });

  test('negative values use a typographic minus and −0 prints as 0', () => {
    expect(formatCoordinate(-2.5, 0.025)).toBe('−2.5');
    expect(formatCoordinate(-0.0001, 0.025)).toBe('0');
  });

  test('huge values use scientific notation', () => {
    expect(formatCoordinate(12345678, 1000)).toBe('1.2346e7');
  });
});

describe('formatRangeValue: axis range boxes in the settings', () => {
  test('six significant figures with a typographic minus', () => {
    expect(formatRangeValue(-8.444561234)).toBe('−8.44456');
    expect(formatRangeValue(10)).toBe('10');
    expect(formatRangeValue(0.30000000000000004)).toBe('0.3');
  });
});
