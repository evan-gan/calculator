/**
 * Error raised for problems the user can fix (bad syntax, domain errors, unsupported input).
 * The UI shows `message` directly, so it should say what went wrong and how to fix it.
 */
export class MathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MathError';
  }
}
