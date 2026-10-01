<script lang="ts">
  import { onMount } from 'svelte';
  import { loadMathQuill } from '../mathquill/loadMathQuill';
  import { MATH_FIELD_CONFIG } from '../mathquill/config';
  import type { EditableMathField } from '../mathquill/types';
  import type { KeyAction } from '../keypad/keys';

  interface Props {
    /** Current contents as LaTeX. Two-way bindable. */
    latex?: string;
    onSubmit?: () => void;
    /** Backspace pressed at the very start of the field. */
    onDeleteOutOf?: () => void;
    /** Up/Down arrow pressed with nowhere further to go inside the field. */
    onUpOutOf?: () => void;
    onDownOutOf?: () => void;
    label?: string;
  }

  let { latex = $bindable(''), onSubmit, onDeleteOutOf, onUpOutOf, onDownOutOf, label = 'Math input' }: Props = $props();

  let host: HTMLSpanElement;
  let field = $state.raw<EditableMathField | null>(null);
  let loadError = $state<string | null>(null);
  // focus() can be called before MathQuill finishes loading (e.g. a just-added line).
  let focusWhenReady = false;

  onMount(() => {
    let destroyed = false;
    loadMathQuill()
      .then((mathQuill) => {
        if (destroyed) return;
        const created = mathQuill.MathField(host, {
          ...MATH_FIELD_CONFIG,
          handlers: {
            edit: (editedField) => {
              latex = editedField.latex();
            },
            enter: () => onSubmit?.(),
            deleteOutOf: () => onDeleteOutOf?.(),
            upOutOf: () => onUpOutOf?.(),
            downOutOf: () => onDownOutOf?.(),
          },
        });
        created.latex(latex);
        if (focusWhenReady) created.focus();
        field = created;
      })
      .catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        loadError = `The math editor failed to load (${reason}). Reload the page to try again.`;
      });
    return () => {
      destroyed = true;
    };
  });

  // Push outside changes (clear, recalling history) into MathQuill without looping on our own edits.
  $effect(() => {
    if (field && field.latex() !== latex) field.latex(latex);
  });

  /** Apply a keypad action to the field. Clear and submit are handled by the parent. */
  export function applyAction(action: KeyAction): void {
    if (!field) return;
    switch (action.type) {
      case 'write':
        field.write(action.latex);
        break;
      case 'cmd':
        field.cmd(action.command);
        break;
      case 'typed':
        field.typedText(action.text);
        break;
      case 'keystroke':
        field.keystroke(action.key);
        break;
    }
    field.focus();
  }

  export function focus(): void {
    if (field) field.focus();
    else focusWhenReady = true;
  }
</script>

<div class="math-field">
  <span bind:this={host} class="editor" aria-label={label}></span>
  {#if loadError}
    <p class="load-error" role="alert">{loadError}</p>
  {/if}
</div>

<style>
  .math-field {
    min-width: 0;
  }

  .editor {
    display: block;
    width: 100%;
    font-size: var(--font-size-math);
    overflow-x: auto;
  }

  .load-error {
    margin: var(--space-2) 0 0;
    color: var(--color-error);
    font-size: var(--font-size-small);
  }
</style>
