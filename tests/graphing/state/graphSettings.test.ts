import { describe, expect, test } from 'vitest';
import { defaultGraphSettings, mergeGraphSettings } from '../../../src/graphing/state/graphSettings';

describe('mergeGraphSettings: reading saved graph settings safely', () => {
  test('nothing saved gives the defaults', () => {
    expect(mergeGraphSettings(null)).toEqual(defaultGraphSettings());
    expect(mergeGraphSettings('garbage')).toEqual(defaultGraphSettings());
  });

  test('saved choices are kept', () => {
    const merged = mergeGraphSettings({ gridType: 'polar', showArrows: true, xAxis: { visible: false, label: 'time', step: 2 } });
    expect(merged.gridType).toBe('polar');
    expect(merged.showArrows).toBe(true);
    expect(merged.xAxis).toEqual({ visible: false, label: 'time', step: 2 });
    expect(merged.showGrid).toBe(true);
  });

  test('malformed fields fall back to the defaults', () => {
    const merged = mergeGraphSettings({ gridType: 'hexagonal', showGrid: 'yes', yAxis: { step: -1, label: 5 } });
    expect(merged.gridType).toBe('cartesian');
    expect(merged.showGrid).toBe(true);
    expect(merged.yAxis).toEqual({ visible: true, label: '', step: null });
  });
});
