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
    /** Let phones open their own keyboard (when the app's keypad is hidden). */
    allowSystemKeyboard?: boolean;
  }

  let {
    latex = $bindable(''),
    onSubmit,
    onDeleteOutOf,
    onUpOutOf,
    onDownOutOf,
    label = 'Math input',
    allowSystemKeyboard = false,
  }: Props = $props();

  let host: HTMLSpanElement;
  let field = $state.raw<EditableMathField | null>(null);
  let loadError = $state<string | null>(null);
  // focus() can be called before MathQuill finishes loading (e.g. a just-added line).
  let focusWhenReady: { cursorAtEnd: boolean } | null = null;

  /**
   * While the app's own keypad is showing, stop phones from popping up the system keyboard.
   * inputmode="none" only hides the virtual keyboard; the textarea stays focusable, so
   * the caret, long-press paste/select and hardware keyboards keep working
   * (unlike readonly, which would break paste).
   */
  $effect(() => {
    if (!field) return;
    const hiddenTextarea = host.querySelector('textarea');
    hiddenTextarea?.setAttribute('inputmode', allowSystemKeyboard ? 'text' : 'none');
  });

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
        field = created;
        if (focusWhenReady) focus(focusWhenReady.cursorAtEnd);
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

  /**
   * Give the field keyboard focus. MathQuill otherwise puts the cursor back where it last was,
   * so `cursorAtEnd` is for arriving from elsewhere (deleting the line below, clicking the row).
   */
  export function focus(cursorAtEnd = false): void {
    if (!field) {
      focusWhenReady = { cursorAtEnd };
      return;
    }
    if (cursorAtEnd) field.moveToRightEnd();
    field.focus();
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
