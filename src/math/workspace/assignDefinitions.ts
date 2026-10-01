import type { ParsedLine } from './types';

export interface DefinitionPlan {
  /** Variable -> index of the line that defines it. */
  definers: Map<string, number>;
  /** Variables defined explicitly by more than one line (all of those lines show an error). */
  duplicates: Set<string>;
  /** Per line: the variable it defines, or null. */
  targets: (string | null)[];
}

/**
 * Decide which line defines which variable, independent of line order.
 * 1. Explicit definitions (`a = 2b + 1`) claim their variable.
 * 2. Other equations with exactly one variable not defined elsewhere claim that variable
 *    (so `2x = 6` defines x). Repeated until nothing changes, so a definition further down
 *    can make an equation further up solvable.
 */
export function assignDefinitions(lines: ParsedLine[]): DefinitionPlan {
  const targets: (string | null)[] = lines.map(() => null);
  const explicitLines = new Map<string, number[]>();
  lines.forEach((line, index) => {
    if (line.kind !== 'equation' || !line.explicitTarget) return;
    explicitLines.set(line.explicitTarget, [...(explicitLines.get(line.explicitTarget) ?? []), index]);
  });

  const definers = new Map<string, number>();
  const duplicates = new Set<string>();
  for (const [variable, indices] of explicitLines) {
    if (indices.length > 1) duplicates.add(variable);
    else definers.set(variable, indices[0]);
    indices.forEach((index) => (targets[index] = variable));
  }

  let changed = true;
  while (changed) {
    changed = false;
    lines.forEach((line, index) => {
      if (line.kind !== 'equation' || targets[index] !== null) return;
      const unknowns = line.variables.filter((variable) => !definers.has(variable) && !duplicates.has(variable));
      if (unknowns.length !== 1) return;
      definers.set(unknowns[0], index);
      targets[index] = unknowns[0];
      changed = true;
    });
  }
  return { definers, duplicates, targets };
}
