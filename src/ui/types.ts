export type DisplayMode = 'exact' | 'decimal';

/** A link from one app to the other (calculator ↔ graphing). */
export interface AppLink {
  href: string;
  label: string;
}

/** One editable line in the expression list. `id` stays stable while lines move or change. */
export interface ExpressionLine {
  id: number;
  latex: string;
}
