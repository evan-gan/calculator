import { describe, expect, test } from 'vitest';
import { isSpacer, KEYPAD_TABS } from '../../../src/ui/keypad/keys';

describe('keypad layout data', () => {
  test.each(KEYPAD_TABS.flatMap((tab) => tab.groups.map((group, index) => [tab.id, index, group] as const)))(
    '%s tab, group %d fills complete rows',
    (_tabId, _index, group) => {
      const usedColumns = group.slots.reduce((total, slot) => total + (isSpacer(slot) ? slot.spacer : (slot.span ?? 1)), 0);
      expect(usedColumns % group.columns).toBe(0);
    },
  );

  test('every tab has an Enter key so a calculation can always be saved', () => {
    for (const tab of KEYPAD_TABS) {
      const slots = tab.groups.flatMap((group) => group.slots);
      expect(slots.some((slot) => !isSpacer(slot) && slot.action.type === 'submit')).toBe(true);
    }
  });
});
