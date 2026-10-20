<script lang="ts">
  import AxisSettingsFields from './AxisSettingsFields.svelte';
  import CheckboxField from './CheckboxField.svelte';
  import GridTypePicker from './GridTypePicker.svelte';
  import type { AngleMode, ViewWindow } from '../../../math';
  import SegmentedToggle from '../../../ui/components/SegmentedToggle.svelte';
  import { defaultGraphSettings, type GraphSettings, type TextSize } from '../../state/graphSettings';

  interface Props {
    settings: GraphSettings;
    angleMode: AngleMode;
    /** What's on screen, shown (and editable) as the axis ranges. */
    window: ViewWindow;
    /** Show a typed window; returns false if it's not a valid range. */
    onWindowChange: (window: ViewWindow) => boolean;
  }

  let { settings = $bindable(), angleMode = $bindable(), window, onWindowChange }: Props = $props();

  const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; ariaLabel: string; fontSize: string }[] = [
    { value: 'normal', label: 'A', ariaLabel: 'Normal text', fontSize: '1rem' },
    { value: 'large', label: 'A', ariaLabel: 'Large text', fontSize: '1.6rem' },
  ];
  const ANGLE_OPTIONS: { value: AngleMode; label: string }[] = [
    { value: 'radians', label: 'Radians' },
    { value: 'degrees', label: 'Degrees' },
  ];
</script>

<div class="settings-menu" role="dialog" aria-label="Graph settings">
  <SegmentedToggle bind:value={settings.textSize} options={TEXT_SIZE_OPTIONS} label="Text size" stretch />

  <div class="grid-options">
    <div class="grid-toggle">
      <CheckboxField bind:checked={settings.showGrid} label="Grid" />
      <GridTypePicker bind:value={settings.gridType} />
    </div>
    <div class="grid-details">
      <CheckboxField bind:checked={settings.showAxisNumbers} label="Axis Numbers" compact />
      <CheckboxField bind:checked={settings.showMinorGridlines} label="Minor Gridlines" compact />
    </div>
  </div>
  <CheckboxField bind:checked={settings.showArrows} label="Arrows" />

  <hr />
  <AxisSettingsFields
    bind:axis={settings.xAxis}
    variable="x"
    title="X-Axis"
    min={window.xMin}
    max={window.xMax}
    onRangeChange={(xMin, xMax) => onWindowChange({ ...window, xMin, xMax })}
  />
  <AxisSettingsFields
    bind:axis={settings.yAxis}
    variable="y"
    title="Y-Axis"
    min={window.yMin}
    max={window.yMax}
    onRangeChange={(yMin, yMax) => onWindowChange({ ...window, yMin, yMax })}
  />

  <details class="more">
    <summary>More Options</summary>
    <div class="more-body">
      <CheckboxField bind:checked={settings.lockViewport} label="Lock viewport" />
      <button type="button" class="reset" onclick={() => (settings = defaultGraphSettings())}>Reset graph settings</button>
    </div>
  </details>

  <hr />
  <SegmentedToggle bind:value={angleMode} options={ANGLE_OPTIONS} label="Angle unit" stretch />
</div>

<style>
  .settings-menu {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    width: min(330px, calc(100vw - 88px));
    max-height: 100%;
    overflow-y: auto;
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-medium);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.18);
  }

  /* The menu scrolls when short (phones); without this its rows would squash instead. */
  .settings-menu > :global(*) {
    flex-shrink: 0;
  }

  .grid-options {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .grid-toggle,
  .grid-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .grid-toggle :global(.grid-type) {
    margin-left: 26px;
  }

  hr {
    width: 100%;
    margin: 0;
    border: none;
    border-top: 1px solid var(--color-border);
  }

  .more summary {
    cursor: pointer;
    font-size: 1.05rem;
  }

  .more-body {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2) 0 0 var(--space-4);
  }

  .reset {
    padding: 4px 10px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-small);
    background: var(--color-surface-muted);
    color: var(--color-text);
    cursor: pointer;
  }
</style>
