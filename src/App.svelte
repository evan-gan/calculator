<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { evaluateWorkspace, type AngleMode } from './math';
  import ExpressionRow from './ui/components/ExpressionRow.svelte';
  import Keypad from './ui/components/Keypad.svelte';
  import type { KeyAction } from './ui/keypad/keys';
  import { insertLineAfter, neighborId, nextFreeId, removeLine } from './ui/state/lines';
  import { loadSavedLines, saveLines } from './ui/state/savedLines';
  import { UndoHistory } from './ui/state/undoHistory';
  import type { DisplayMode, ExpressionLine } from './ui/types';

  const initialLines = loadSavedLines() ?? [{ id: 0, latex: '' }];
  let lines = $state<ExpressionLine[]>(initialLines);
  let nextId = nextFreeId(initialLines);
  let activeId = $state(initialLines[initialLines.length - 1].id);
  let displayMode = $state<DisplayMode>('exact');
  let angleMode = $state<AngleMode>('radians');
  const rows: Record<number, ExpressionRow> = {};

  // Every line is evaluated together so lines can use each other's variables.
  const results = $derived(evaluateWorkspace(lines.map((line) => line.latex), { angleMode }));

  const createEmptyLine = (): ExpressionLine => ({ id: nextId++, latex: '' });

  async function focusLine(id: number): Promise<void> {
    activeId = id;
    await tick();
    rows[id]?.focus();
  }

  onMount(() => {
    focusLine(activeId);
  });

  // ---- undo / redo over the whole list ----
  const undoHistory = new UndoHistory<string>();
  let canUndo = $state(false);
  let canRedo = $state(false);
  let lastSnapshot = JSON.stringify(initialLines);
  let restoringSnapshot = false;

  $effect(() => {
    const snapshot = JSON.stringify(lines);
    if (snapshot === lastSnapshot) return;
    if (!restoringSnapshot) undoHistory.record(lastSnapshot);
    restoringSnapshot = false;
    lastSnapshot = snapshot;
    canUndo = undoHistory.canUndo;
    canRedo = undoHistory.canRedo;
    saveLines(lines);
  });

  function restore(snapshot: string | null): void {
    if (snapshot === null) return;
    restoringSnapshot = true;
    lines = JSON.parse(snapshot) as ExpressionLine[];
    const stillThere = lines.some((line) => line.id === activeId);
    focusLine(stillThere ? activeId : lines[lines.length - 1].id);
  }

  // ---- line editing ----

  function addLineAfter(id: number): void {
    const line = createEmptyLine();
    lines = insertLineAfter(lines, id, line);
    focusLine(line.id);
  }

  function deleteLine(id: number): void {
    const { lines: remaining, focusId } = removeLine(lines, id, createEmptyLine);
    lines = remaining;
    focusLine(focusId);
  }

  function moveFocus(id: number, offset: number): void {
    const target = neighborId(lines, id, offset);
    if (target !== null) focusLine(target);
  }

  function clearAll(): void {
    lines = [createEmptyLine()];
    focusLine(lines[0].id);
  }

  /** Exact value of the nearest numeric line above the active one, for the "ans" key. */
  function previousAnswer(): string | null {
    const activeIndex = lines.findIndex((line) => line.id === activeId);
    for (let index = activeIndex - 1; index >= 0; index--) {
      const result = results[index]?.result;
      if (result?.kind === 'value') return result.result.exact.replace(/^=/, '');
    }
    return null;
  }

  function handleKeyAction(action: KeyAction): void {
    const row = rows[activeId];
    if (action.type === 'submit') {
      addLineAfter(activeId);
    } else if (action.type === 'ans') {
      const answer = previousAnswer();
      if (answer !== null) row?.applyAction({ type: 'write', latex: `\\left(${answer}\\right)` });
    } else {
      row?.applyAction(action);
    }
  }
</script>

<div class="app">
  <main class="expressions" aria-label="Expression list">
    <ol class="lines">
      {#each lines as line, index (line.id)}
        <ExpressionRow
          bind:this={rows[line.id]}
          bind:latex={line.latex}
          result={results[index]?.result ?? { kind: 'empty' }}
          mode={displayMode}
          showPlaceholder={lines.length === 1}
          onEnter={() => addLineAfter(line.id)}
          onFocus={() => (activeId = line.id)}
          onRemove={() => deleteLine(line.id)}
          onDeleteEmpty={() => lines.length > 1 && deleteLine(line.id)}
          onUp={() => moveFocus(line.id, -1)}
          onDown={() => moveFocus(line.id, 1)}
        />
      {/each}
    </ol>
  </main>

  <Keypad
    bind:angleMode
    bind:displayMode
    {canUndo}
    {canRedo}
    onAction={handleKeyAction}
    onUndo={() => restore(undoHistory.undo(JSON.stringify(lines)))}
    onRedo={() => restore(undoHistory.redo(JSON.stringify(lines)))}
    onClearAll={clearAll}
  />
</div>

<style>
  .app {
    height: 100dvh;
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
  }

  .expressions {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: var(--color-surface);
  }

  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
