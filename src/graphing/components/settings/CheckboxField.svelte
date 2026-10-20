<script lang="ts">
  interface Props {
    checked: boolean;
    label: string;
    /** Smaller text for secondary options (Axis Numbers, Minor Gridlines). */
    compact?: boolean;
  }

  let { checked = $bindable(), label, compact = false }: Props = $props();
</script>

<label class="checkbox-field" class:compact>
  <input type="checkbox" bind:checked />
  <span>{label}</span>
</label>

<style>
  .checkbox-field {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 1.05rem;
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
  }

  .checkbox-field.compact {
    font-size: 0.95rem;
    gap: var(--space-1);
  }

  input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--color-accent);
    cursor: pointer;
  }
</style>
