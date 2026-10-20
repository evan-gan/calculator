/** Which answer format results show; each matches a field of `ResultLine`. */
export type DisplayMode = 'exact' | 'decimal' | 'scientific';

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
