<script lang="ts">
  interface Props {
    shown: boolean;
  }

  let { shown = $bindable() }: Props = $props();
</script>

<button
  type="button"
  class="keypad-toggle"
  aria-pressed={shown}
  aria-label={shown ? 'Hide keypad' : 'Show keypad'}
  title={shown ? 'Hide keypad' : 'Show keypad'}
  onmousedown={(event) => event.preventDefault()}
  onclick={() => (shown = !shown)}
>
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <path d="M6 9.5h.01M10 9.5h.01M14 9.5h.01M18 9.5h.01M6 12.5h.01M10 12.5h.01M14 12.5h.01M18 12.5h.01M8 15.5h8" />
  </svg>
</button>

<style>
  .keypad-toggle {
    display: flex;
    align-items: center;
    width: 40px;
    height: 36px;
    padding: 5px 7px;
    border: 1px solid transparent;
    border-radius: var(--radius-medium);
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .keypad-toggle:hover {
    color: var(--color-text);
  }

  .keypad-toggle[aria-pressed='true'] {
    background: var(--color-accent-soft);
    color: var(--color-accent-strong-text);
  }

  svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
