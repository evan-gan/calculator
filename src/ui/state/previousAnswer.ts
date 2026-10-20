import type { CalculationResult } from '../../math';

/**
 * The exact value of the nearest numeric line above the active one, for the "ans" key.
 *
 * Args:
 *   results: each line's result, in display order
 *   activeIndex: position of the line being edited
 *
 * Returns:
 *   That value's LaTeX without its leading "=", or null if no line above has a number.
 */
export function previousAnswer(results: CalculationResult[], activeIndex: number): string | null {
  for (let index = activeIndex - 1; index >= 0; index--) {
    const result = results[index];
    if (result?.kind === 'value') return result.result.exact.replace(/^=/, '');
  }
  return null;
}
