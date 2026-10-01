/** Linear undo/redo stack of snapshots (the math field's LaTeX). */
export class UndoHistory<Snapshot> {
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];

  // Keeps memory bounded during long sessions; older edits simply can't be undone.
  constructor(private readonly limit = 200) {}

  /** Remember the state that existed before a new edit. Clears anything that could be redone. */
  record(previous: Snapshot): void {
    this.past.push(previous);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
  }

  /** Step back. Returns the snapshot to restore, or null if there is nothing to undo. */
  undo(current: Snapshot): Snapshot | null {
    if (this.past.length === 0) return null;
    this.future.push(current);
    return this.past.pop()!;
  }

  /** Step forward again after an undo. Returns null if there is nothing to redo. */
  redo(current: Snapshot): Snapshot | null {
    if (this.future.length === 0) return null;
    this.past.push(current);
    return this.future.pop()!;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }
}
