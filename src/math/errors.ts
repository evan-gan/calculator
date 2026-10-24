/**
 * How serious an error is, which decides how the UI flags it:
 * - invalid: the input is wrong (bad syntax, a domain error, a divergent series). Red.
 * - unsupported: the input is fine but the calculator can't do it (yet). Yellow.
 * - unresolved: the line can't be worked out *yet*, e.g. it has more unknowns than one or
 *   uses a variable with no single value. Often expected while still typing. Grey.
 */
export type MathErrorCategory = 'invalid' | 'unsupported' | 'unresolved';

/**
 * Error raised for problems the user can fix (bad syntax, domain errors, unsupported input).
 * The UI shows `message` directly, so it should say what went wrong and how to fix it.
 */
export class MathError extends Error {
  constructor(
    message: string,
    readonly category: MathErrorCategory = 'invalid',
  ) {
    super(message);
    this.name = 'MathError';
  }
}
