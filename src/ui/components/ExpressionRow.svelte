<script lang="ts">
  import type { Snippet } from 'svelte';
  import MathField from './MathField.svelte';
  import ResultView from './ResultView.svelte';
  import type { CalculationResult } from '../../math';
  import type { KeyAction } from '../keypad/keys';
  import type { DisplayMode } from '../types';

  interface Props {
    latex: string;
    result: CalculationResult;
    mode: DisplayMode;
    /** Hint shown while the line is empty, or null for none. */
    placeholder: string | null;
    allowSystemKeyboard?: boolean;
    /** Drawn before the input, e.g. the graphing app's curve color. */
    marker?: Snippet;
    onEnter: () => void;
    onFocus: () => void;
    onRemove: () => void;
    /** Backspace on an empty line. */
    onDeleteEmpty: () => void;
    onUp: () => void;
    onDown: () => void;
  }

  let {
    latex = $bindable(),
    result,
    mode,
    placeholder,
    allowSystemKeyboard = false,
    marker,
    onEnter,
    onFocus,
    onRemove,
    onDeleteEmpty,
    onUp,
    onDown,
  }: Props = $props();

  let mathField: MathField;

  export function applyAction(action: KeyAction): void {
    mathField.applyAction(action);
  }

  export function focus(cursorAtEnd = false): void {
    mathField.focus(cursorAtEnd);
  }

  // The input, the answer (selectable for copying) and the delete button handle their own presses.
  const SELF_HANDLED_PARTS = '.mq-editable-field, .output, button';

  /** A press anywhere else on the row (padding, empty space) edits this line. */
  function handleRowPress(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(SELF_HANDLED_PARTS)) return;
    // Without this the press would blur the field again right after focusing it.
    event.preventDefault();
    mathField.focus(true);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -- a mouse shortcut only; the field itself is keyboard-focusable -->
<li class="row" onfocusin={onFocus} onmousedown={handleRowPress}>
  {@render marker?.()}
  <div class="field">
    <MathField
      bind:this={mathField}
      bind:latex
      onSubmit={onEnter}
      onDeleteOutOf={() => latex === '' && onDeleteEmpty()}
      onUpOutOf={onUp}
      onDownOutOf={onDown}
      label="Expression or equation"
      {allowSystemKeyboard}
    />
    {#if placeholder && latex === ''}
      <span class="placeholder" aria-hidden="true">{placeholder}</span>
    {/if}
  </div>
  <div class="output" aria-live="polite">
    <ResultView {result} {mode} quietErrors />
  </div>
  <button
    type="button"
    class="remove"
    aria-label="Delete this line"
    onmousedown={(event) => event.preventDefault()}
    onclick={onRemove}>×</button
  >
</li>

<style>
  .row {
    position: relative;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-5);
    padding: var(--space-5) var(--space-6) var(--space-5) var(--space-5);
    min-height: 84px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-row-border);
    box-shadow: inset 4px 0 0 transparent;
    transition: box-shadow 120ms ease;
    cursor: text;
  }

  /* Accent bar on the left marks the line being edited. */
  .row:focus-within {
    box-shadow: inset 4px 0 0 var(--color-accent);
  }

  .field {
    position: relative;
    flex: 1 1 240px;
    min-width: 0;
  }

  .placeholder {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    pointer-events: none;
    font-size: var(--font-size-body);
  }

  .output {
    margin-left: auto;
    min-width: 0;
    max-width: 100%;
  }

  .remove {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--color-text-muted);
    font-size: 1.3rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity 120ms ease;
  }

  .row:hover .remove,
  .row:focus-within .remove {
    opacity: 1;
  }

  .remove:hover {
    background: var(--color-surface-muted);
    color: var(--color-text);
  }

  @media (hover: none) {
    .remove {
      opacity: 1;
    }
  }
</style>
