export type DisplayMode = 'exact' | 'decimal';

/** One editable line in the expression list. `id` stays stable while lines move or change. */
export interface ExpressionLine {
  id: number;
  latex: string;
}
