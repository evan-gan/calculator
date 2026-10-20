<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    onClick: () => void;
    pressed?: boolean;
    disabled?: boolean;
    /** The icon: an <svg> path drawn with the button's stroke styles. */
    children: Snippet;
  }

  let { label, onClick, pressed, disabled = false, children }: Props = $props();
</script>

<!-- mousedown is cancelled so keyboard focus stays in the expression being typed. -->
<button
  type="button"
  class="control-button"
  aria-label={label}
  title={label}
  aria-pressed={pressed}
  {disabled}
  onmousedown={(event) => event.preventDefault()}
  onclick={onClick}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">{@render children()}</svg>
</button>

<style>
  .control-button {
    width: 40px;
    height: 40px;
    padding: 9px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-medium);
    background: var(--color-surface);
    color: var(--color-text-muted);
    cursor: pointer;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
  }

  .control-button:hover:not(:disabled) {
    color: var(--color-text);
  }

  .control-button[aria-pressed='true'] {
    background: var(--color-accent-soft);
    color: var(--color-accent-strong-text);
  }

  .control-button:disabled {
    opacity: 0.45;
    cursor: default;
  }

  svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
