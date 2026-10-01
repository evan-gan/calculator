<script lang="ts">
  import KeyFace from './KeyFace.svelte';
  import type { KeyDefinition } from '../keypad/keys';

  let { definition, onPress }: { definition: KeyDefinition; onPress: (definition: KeyDefinition) => void } = $props();
</script>

<!-- mousedown preventDefault keeps focus (and the cursor) inside the math field -->
<button
  type="button"
  class="key {definition.variant}"
  style:grid-column="span {definition.span ?? 1}"
  aria-label={definition.ariaLabel}
  onmousedown={(event) => event.preventDefault()}
  onclick={() => onPress(definition)}
>
  <KeyFace label={definition.label} />
</button>

<style>
  .key {
    min-height: var(--key-height);
    padding: 0 var(--space-1);
    border: 1px solid var(--color-key-border);
    border-radius: var(--radius-small);
    cursor: pointer;
    font-family: var(--font-math);
    font-size: var(--font-size-key);
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 0 rgb(0 0 0 / 8%);
    transition: filter 100ms ease;
  }

  .key:hover {
    filter: brightness(0.95);
  }

  .key:active {
    filter: brightness(0.88);
  }

  .key:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }

  .number {
    background: var(--color-key-number);
  }

  .plain {
    background: var(--color-key-plain);
  }

  .control {
    background: var(--color-key-control);
    font-family: var(--font-ui);
  }

  .accent {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: var(--color-accent-text);
    font-family: var(--font-ui);
    font-size: 1.6rem;
  }

  @media (max-width: 560px) {
    .key {
      font-size: 1.1rem;
      min-height: 46px;
    }
  }
</style>
