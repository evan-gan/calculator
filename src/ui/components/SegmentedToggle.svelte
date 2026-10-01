<script lang="ts" generics="Value extends string">
  interface Props {
    value: Value;
    options: { value: Value; label: string }[];
    label: string;
  }

  // Two-or-more option switch, styled like the RAD | DEG control.
  let { value = $bindable(), options, label }: Props = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.value}
      class:selected={value === option.value}
      onmousedown={(event) => event.preventDefault()}
      onclick={() => (value = option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    border: 1px solid var(--color-key-border);
    border-radius: var(--radius-small);
    overflow: hidden;
    background: var(--color-key-plain);
  }

  button {
    border: none;
    background: transparent;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-text);
  }

  button + button {
    border-left: 1px solid var(--color-key-border);
  }

  button.selected {
    background: var(--color-accent-soft);
    color: var(--color-accent-strong-text);
    box-shadow: inset 0 0 0 1px var(--color-accent);
  }
</style>
