import { insertLineAfter, neighborId, nextFreeId, removeLine } from './lines';
import { loadSavedLines, saveLines } from './savedLines';
import { UndoHistory } from './undoHistory';
import type { ExpressionLine } from '../types';

/**
 * State of an editable expression list shared by every app: the lines, which one is active,
 * undo/redo over the whole list, and saving to this browser. Construct it while a component
 * initializes, since it registers an effect that records each change.
 */
export class LineEditor {
  lines = $state<ExpressionLine[]>([]);
  activeId = $state(0);
  canUndo = $state(false);
  canRedo = $state(false);
  /** Set by ExpressionList: moves keyboard focus into a line once it's on screen. */
  focusHandler: ((id: number) => void) | null = null;

  private nextId: number;
  private readonly undoHistory = new UndoHistory<string>();
  private lastSnapshot: string;
  private restoringSnapshot = false;

  constructor(private readonly storageKey: string) {
    const initialLines = loadSavedLines(storageKey) ?? [{ id: 0, latex: '' }];
    this.lines = initialLines;
    this.nextId = nextFreeId(initialLines);
    this.activeId = initialLines[initialLines.length - 1].id;
    this.lastSnapshot = JSON.stringify(initialLines);
    $effect(() => this.recordChange());
  }

  /** Index of the active line in `lines` (-1 if it was removed). */
  get activeIndex(): number {
    return this.lines.findIndex((line) => line.id === this.activeId);
  }

  // Typing edits lines in place, so changes are caught by comparing snapshots rather than in each method.
  private recordChange(): void {
    const snapshot = JSON.stringify(this.lines);
    if (snapshot === this.lastSnapshot) return;
    if (!this.restoringSnapshot) this.undoHistory.record(this.lastSnapshot);
    this.restoringSnapshot = false;
    this.lastSnapshot = snapshot;
    this.canUndo = this.undoHistory.canUndo;
    this.canRedo = this.undoHistory.canRedo;
    saveLines(this.storageKey, this.lines);
  }

  private createEmptyLine(): ExpressionLine {
    return { id: this.nextId++, latex: '' };
  }

  focusLine(id: number): void {
    this.activeId = id;
    this.focusHandler?.(id);
  }

  addLineAfter(id: number): void {
    const line = this.createEmptyLine();
    this.lines = insertLineAfter(this.lines, id, line);
    this.focusLine(line.id);
  }

  deleteLine(id: number): void {
    const { lines, focusId } = removeLine(this.lines, id, () => this.createEmptyLine());
    this.lines = lines;
    this.focusLine(focusId);
  }

  moveFocus(id: number, offset: number): void {
    const target = neighborId(this.lines, id, offset);
    if (target !== null) this.focusLine(target);
  }

  clearAll(): void {
    this.lines = [this.createEmptyLine()];
    this.focusLine(this.lines[0].id);
  }

  undo(): void {
    this.restore(this.undoHistory.undo(JSON.stringify(this.lines)));
  }

  redo(): void {
    this.restore(this.undoHistory.redo(JSON.stringify(this.lines)));
  }

  private restore(snapshot: string | null): void {
    if (snapshot === null) return;
    this.restoringSnapshot = true;
    this.lines = JSON.parse(snapshot) as ExpressionLine[];
    const stillThere = this.lines.some((line) => line.id === this.activeId);
    this.focusLine(stillThere ? this.activeId : this.lines[this.lines.length - 1].id);
  }
}
