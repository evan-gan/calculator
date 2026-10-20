<script lang="ts">
  import { evaluateNumberInput } from '../../../math';

  interface Props {
    /** The current value; null shows the box empty. */
    value: number | null;
    format: (value: number) => string;
    /**
     * Called with the typed value when the box is left or Enter is pressed (null if emptied
     * and `allowEmpty`). Return false to reject it, which marks the box as invalid.
     */
    onCommit: (value: number | null) => boolean;
    label: string;
    allowEmpty?: boolean;
    placeholder?: string;
  }

  let { value, format, onCommit, label, allowEmpty = false, placeholder = '' }: Props = $props();

  let text = $state('');
  let editing = $state(false);
  let invalid = $state(false);

  // While the box isn't being edited it follows the value (the ranges change as the graph pans).
  $effect(() => {
    if (!editing) text = value === null ? '' : format(value);
  });

  function commit(): void {
    const trimmed = text.trim();
    const parsed = trimmed === '' && allowEmpty ? null : evaluateNumberInput(trimmed);
    const accepted = (parsed !== null || (allowEmpty && trimmed === '')) && onCommit(parsed);
    invalid = !accepted;
    if (accepted) editing = false;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') {
      editing = false;
      invalid = false;
    }
  }
</script>

<input
  class="number-box"
  class:invalid
  type="text"
  inputmode="decimal"
  autocomplete="off"
  spellcheck="false"
  aria-label={label}
  aria-invalid={invalid}
  title={invalid ? 'Type a number, like −10, 2.5 or 2π' : undefined}
  {placeholder}
  bind:value={text}
  oninput={() => (editing = true)}
  onblur={() => editing && commit()}
  onkeydown={handleKeydown}
/>

<style>
  .number-box {
    width: 100%;
    min-width: 0;
    padding: 2px 4px;
    border: none;
    border-bottom: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    font-family: var(--font-math);
    font-size: 1rem;
    text-align: center;
    text-overflow: ellipsis;
  }

  .number-box:focus {
    outline: none;
    border-bottom: 2px solid var(--color-accent);
  }

  .number-box.invalid {
    border-bottom: 2px solid var(--color-error);
    background: var(--color-error-soft);
  }
</style>
