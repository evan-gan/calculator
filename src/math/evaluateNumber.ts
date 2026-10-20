import { collectVariables } from './ast/inspect';
import { MathError } from './errors';
import { evaluate } from './evaluate/evaluate';
import { parseLatex } from './parse/parser';

/**
 * Plain typed text ("2pi", "−3.5", "1/2") as LaTeX the parser understands. Settings fields are
 * ordinary text boxes, so π may arrive as "pi" or the symbol itself.
 */
function plainTextToLatex(text: string): string {
  return text
    .trim()
    .replace(/π|\bpi\b|(?<=\d)pi\b/gi, '\\pi ')
    .replace(/√\s*(\d+(?:\.\d+)?|\\pi)/g, '\\sqrt{$1}');
}

/**
 * Value of a typed constant like "-10", "2π" or "√2" (for number boxes such as the graph's axis
 * ranges).
 *
 * Args:
 *   text: plain text or LaTeX with no variables
 *
 * Returns:
 *   The finite real value, or null if the text is empty, has variables, or isn't a real number.
 */
export function evaluateNumberInput(text: string): number | null {
  if (text.trim() === '') return null;
  // Plain numbers, including JavaScript's 1e3 form (which the parser would read as 1·e·3).
  const plainNumber = Number(text.trim().replace('−', '-'));
  if (Number.isFinite(plainNumber)) return plainNumber;
  try {
    const statement = parseLatex(plainTextToLatex(text));
    if (statement.kind !== 'expression' || collectVariables(statement.expr).length > 0) return null;
    const value = evaluate(statement.expr);
    return Number.isFinite(value) ? value : null;
  } catch (error) {
    // Bad syntax is an ordinary typing mistake: the caller keeps the old value and marks the box.
    if (error instanceof MathError) return null;
    throw error;
  }
}
