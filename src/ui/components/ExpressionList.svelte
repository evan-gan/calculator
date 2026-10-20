<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import ExpressionRow from './ExpressionRow.svelte';
  import type { CalculationResult } from '../../math';
  import type { KeyAction } from '../keypad/keys';
  import type { LineEditor } from '../state/lineEditor.svelte';
  import { previousAnswer } from '../state/previousAnswer';
  import { historyCommandFor } from '../state/undoShortcut';
  import type { DisplayMode, ExpressionLine } from '../types';

  interface Props {
    editor: LineEditor;
    /** One result per line, in the same order as editor.lines. */
    results: CalculationResult[];
    mode: DisplayMode;
    /** Hint shown while the list is a single empty line. */
    placeholder: string;
    allowSystemKeyboard?: boolean;
    /** Drawn at the start of each row (the graphing app's curve colors). */
    marker?: Snippet<[ExpressionLine, number]>;
  }

  let { editor, results, mode, placeholder, allowSystemKeyboard = false, marker: markerForLine }: Props = $props();

  const rows: Record<number, ExpressionRow> = {};

  onMount(() => {
    editor.focusHandler = async (id) => {
      // A just-added line isn't rendered until the next tick.
      await tick();
      rows[id]?.focus();
    };
    editor.focusLine(editor.activeId);
    // Capture phase, so MathQuill's textarea never sees ⌘Z (it would undo inside its hidden
    // textarea and desync from the math).
    window.addEventListener('keydown', handleHistoryShortcut, { capture: true });
    return () => window.removeEventListener('keydown', handleHistoryShortcut, { capture: true });
  });

  /** Ordinary text boxes (like the graph settings) keep their own browser undo. */
  function isPlainTextBox(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const isTextBox = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
    return isTextBox && !target.closest('.mq-editable-field');
  }

  function handleHistoryShortcut(event: KeyboardEvent): void {
    const command = historyCommandFor(event);
    if (!command || isPlainTextBox(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (command === 'undo') editor.undo();
    else editor.redo();
  }

  /** Apply a keypad key to the active line (Enter adds a line, ans inserts the previous answer). */
  export function handleKeyAction(action: KeyAction): void {
    const row = rows[editor.activeId];
    if (action.type === 'submit') {
      editor.addLineAfter(editor.activeId);
    } else if (action.type === 'ans') {
      const answer = previousAnswer(results, editor.activeIndex);
      if (answer !== null) row?.applyAction({ type: 'write', latex: `\\left(${answer}\\right)` });
    } else {
      row?.applyAction(action);
    }
  }
</script>

<ol class="lines">
  {#each editor.lines as line, index (line.id)}
    <ExpressionRow
      bind:this={rows[line.id]}
      bind:latex={line.latex}
      result={results[index] ?? { kind: 'empty' }}
      {mode}
      placeholder={editor.lines.length === 1 ? placeholder : null}
      {allowSystemKeyboard}
      onEnter={() => editor.addLineAfter(line.id)}
      onFocus={() => (editor.activeId = line.id)}
      onRemove={() => editor.deleteLine(line.id)}
      onDeleteEmpty={() => editor.lines.length > 1 && editor.deleteLine(line.id)}
      onUp={() => editor.moveFocus(line.id, -1)}
      onDown={() => editor.moveFocus(line.id, 1)}
    >
      {#snippet marker()}
        {@render markerForLine?.(line, index)}
      {/snippet}
    </ExpressionRow>
  {/each}
</ol>

<style>
  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
  }
</style>
