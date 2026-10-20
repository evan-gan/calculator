<script lang="ts">
  import CheckboxField from './CheckboxField.svelte';
  import NumberBox from './NumberBox.svelte';
  import type { AxisSettings } from '../../state/graphSettings';
  import { formatRangeValue } from '../../render/gridSteps';

  interface Props {
    axis: AxisSettings;
    /** The axis variable, shown in the range (−10 ≤ x ≤ 10). */
    variable: string;
    title: string;
    /** The visible range along this axis. */
    min: number;
    max: number;
    /** Show a new range; returns false if it can't (minimum not below maximum). */
    onRangeChange: (min: number, max: number) => boolean;
  }

  let { axis = $bindable(), variable, title, min, max, onRangeChange }: Props = $props();

  // A typed step must be positive; empty means automatic.
  const commitStep = (step: number | null) => {
    if (step !== null && !(step > 0)) return false;
    axis.step = step;
    return true;
  };
</script>

<section class="axis-settings">
  <div class="heading">
    <CheckboxField bind:checked={axis.visible} label={title} />
    <label class="name">
      <span class="legend">Label</span>
      <input type="text" bind:value={axis.label} placeholder={`e.g. “${variable}”`} maxlength="40" spellcheck="false" />
    </label>
  </div>
  <div class="range">
    <span class="range-box">
      <NumberBox value={min} format={formatRangeValue} label={`Smallest ${variable}`} onCommit={(value) => value !== null && onRangeChange(value, max)} />
    </span>
    <span class="relation">≤ <i>{variable}</i> ≤</span>
    <span class="range-box">
      <NumberBox value={max} format={formatRangeValue} label={`Largest ${variable}`} onCommit={(value) => value !== null && onRangeChange(min, value)} />
    </span>
    <span class="step-label">Step:</span>
    <span class="step-box">
      <NumberBox value={axis.step} format={formatRangeValue} label={`${title} grid step`} allowEmpty placeholder="auto" onCommit={commitStep} />
    </span>
  </div>
</section>

<style>
  .axis-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  /* Outlined box with its legend sitting on the border, like the screenshot's Label field. */
  .name {
    position: relative;
    flex: 0 1 140px;
    min-width: 0;
  }

  .legend {
    position: absolute;
    top: -0.65em;
    left: 8px;
    padding: 0 3px;
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }

  .name input {
    width: 100%;
    padding: 8px 10px 6px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-medium);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .name input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .range {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 0.8fr);
    align-items: end;
    gap: var(--space-1);
  }

  .relation {
    font-family: var(--font-math);
    font-size: 1.15rem;
    white-space: nowrap;
  }

  .step-label {
    margin-left: var(--space-2);
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }
</style>
