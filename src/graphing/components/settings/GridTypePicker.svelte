<script lang="ts">
  import type { GridType } from '../../state/graphSettings';

  interface Props {
    value: GridType;
  }

  let { value = $bindable() }: Props = $props();
</script>

<!-- Pictures of each grid; the chosen one is filled in. -->
<div class="grid-type" role="radiogroup" aria-label="Grid type">
  <button
    type="button"
    role="radio"
    aria-checked={value === 'cartesian'}
    aria-label="Square grid"
    title="Square grid"
    onclick={() => (value = 'cartesian')}
  >
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" class="disc" />
      <path d="M9 3v26M16 1.5v29M23 3v26M3 9h26M1.5 16h29M3 23h26" />
    </svg>
  </button>
  <button
    type="button"
    role="radio"
    aria-checked={value === 'polar'}
    aria-label="Polar grid"
    title="Polar grid"
    onclick={() => (value = 'polar')}
  >
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" class="disc" />
      <circle cx="16" cy="16" r="9.5" />
      <circle cx="16" cy="16" r="4.5" />
      <path d="M16 1.5v29M1.5 16h29M5.7 5.7l20.6 20.6M26.3 5.7L5.7 26.3" />
    </svg>
  </button>
</div>

<style>
  .grid-type {
    display: flex;
    gap: var(--space-2);
  }

  button {
    width: 36px;
    height: 36px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.2;
  }

  .disc {
    fill: var(--color-surface);
    stroke-width: 1.5;
  }

  button[aria-checked='true'] {
    color: var(--color-surface);
  }

  button[aria-checked='true'] .disc {
    fill: var(--color-text-muted);
    stroke: var(--color-text-muted);
  }

  button:focus-visible {
    outline: 2px solid var(--color-accent);
  }
</style>
