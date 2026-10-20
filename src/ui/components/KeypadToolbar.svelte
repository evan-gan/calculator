<script lang="ts">
  import SegmentedToggle from './SegmentedToggle.svelte';
  import type { AngleMode } from '../../math';
  import type { KeypadTab, KeypadTabId } from '../keypad/keys';
  import type { AppLink, DisplayMode } from '../types';

  interface Props {
    tabs: KeypadTab[];
    activeTab: KeypadTabId;
    angleMode: AngleMode;
    displayMode: DisplayMode;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClearAll: () => void;
    appLink?: AppLink;
  }

  let {
    tabs,
    activeTab = $bindable(),
    angleMode = $bindable(),
    displayMode = $bindable(),
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onClearAll,
    appLink,
  }: Props = $props();

  const ANGLE_OPTIONS: { value: AngleMode; label: string }[] = [
    { value: 'radians', label: 'RAD' },
    { value: 'degrees', label: 'DEG' },
  ];
  const DISPLAY_OPTIONS: { value: DisplayMode; label: string }[] = [
    { value: 'exact', label: 'a/b' },
    { value: 'decimal', label: '1.5' },
  ];

  const keepFocus = (event: MouseEvent) => event.preventDefault();
</script>

<div class="toolbar">
  <div class="tabs" role="tablist" aria-label="Keypad">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === tab.id}
        class:active={activeTab === tab.id}
        onmousedown={keepFocus}
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div class="controls">
    <SegmentedToggle bind:value={angleMode} options={ANGLE_OPTIONS} label="Angle unit" />
    <SegmentedToggle bind:value={displayMode} options={DISPLAY_OPTIONS} label="Answer format: exact or decimal" />
    <button type="button" class="icon" aria-label="Undo" disabled={!canUndo} onmousedown={keepFocus} onclick={onUndo}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7H4V2M4.5 6.5A9 9 0 1 1 3 13" /></svg>
    </button>
    <button type="button" class="icon" aria-label="Redo" disabled={!canRedo} onmousedown={keepFocus} onclick={onRedo}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 7h5V2M19.5 6.5A9 9 0 1 0 21 13" /></svg>
    </button>
    <button type="button" class="text-button" onmousedown={keepFocus} onclick={onClearAll}>clear all</button>
    {#if appLink}
      <a class="text-button" href={appLink.href}>{appLink.label}</a>
    {/if}
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2) var(--space-4);
    padding: var(--space-2) var(--space-3) 0;
  }

  .tabs {
    display: flex;
  }

  .tabs button {
    border: none;
    background: none;
    padding: var(--space-2) var(--space-5) 10px;
    font-size: 1.15rem;
    color: var(--color-text-muted);
    border-bottom: 4px solid transparent;
    cursor: pointer;
  }

  .tabs button.active {
    color: var(--color-text);
    border-bottom-color: var(--color-accent);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .icon {
    border: none;
    background: none;
    width: 36px;
    height: 36px;
    padding: 6px;
    cursor: pointer;
    color: var(--color-text-muted);
  }

  .icon:disabled {
    color: var(--color-key-icon-muted);
    cursor: default;
  }

  .icon svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .text-button {
    border: none;
    background: none;
    font-size: 1.1rem;
    color: var(--color-text-muted);
    cursor: pointer;
    text-decoration: none;
  }

  .text-button:hover,
  .icon:not(:disabled):hover {
    color: var(--color-text);
  }

  @media (max-width: 560px) {
    .tabs {
      width: 100%;
    }

    .tabs button {
      flex: 1;
      padding: var(--space-2) var(--space-2) 8px;
    }

    .controls {
      width: 100%;
      justify-content: space-between;
      gap: var(--space-1);
    }

    .controls :global(.segmented button) {
      padding: 5px 8px;
      font-size: 0.9rem;
    }

    .icon {
      width: 30px;
      height: 30px;
      padding: 5px;
    }

    .text-button {
      font-size: 0.95rem;
    }
  }
</style>
