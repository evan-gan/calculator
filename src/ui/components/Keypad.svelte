<script lang="ts">
  import KeyButton from './KeyButton.svelte';
  import KeypadToolbar from './KeypadToolbar.svelte';
  import type { AngleMode } from '../../math';
  import { isSpacer, KEYPAD_TABS, type KeyAction, type KeyDefinition, type KeypadTabId } from '../keypad/keys';
  import type { AppLink, DisplayMode } from '../types';

  interface Props {
    angleMode: AngleMode;
    displayMode: DisplayMode;
    canUndo: boolean;
    canRedo: boolean;
    onAction: (action: KeyAction) => void;
    onUndo: () => void;
    onRedo: () => void;
    onClearAll: () => void;
    /** Link to the other app (calculator ↔ graphing), shown in the toolbar. */
    appLink?: AppLink;
  }

  let {
    angleMode = $bindable(),
    displayMode = $bindable(),
    canUndo,
    canRedo,
    onAction,
    onUndo,
    onRedo,
    onClearAll,
    appLink,
  }: Props = $props();

  let activeTab = $state<KeypadTabId>('main');
  let shifted = $state(false);

  const tab = $derived(KEYPAD_TABS.find((candidate) => candidate.id === activeTab)!);

  function press(definition: KeyDefinition): void {
    if (definition.action.type === 'shift') {
      shifted = !shifted;
      return;
    }
    onAction(definition.action);
    // Shift applies to one letter, like a phone keyboard.
    if (definition.shifted || shifted) shifted = false;
  }

  const visibleKey = (definition: KeyDefinition) => (shifted && definition.shifted ? { ...definition.shifted, span: definition.span } : definition);
</script>

<div class="keypad">
  <KeypadToolbar
    tabs={KEYPAD_TABS}
    bind:activeTab
    bind:angleMode
    bind:displayMode
    {canUndo}
    {canRedo}
    {onUndo}
    {onRedo}
    {onClearAll}
    {appLink}
  />
  <div class="groups" style:grid-template-columns={tab.groups.map((group) => `${group.columns}fr`).join(' ')}>
    {#each tab.groups as group, groupIndex (`${tab.id}-${groupIndex}`)}
      <div class="group" style:grid-template-columns="repeat({group.columns}, minmax(0, 1fr))">
        {#each group.slots as slot, slotIndex (slotIndex)}
          {#if isSpacer(slot)}
            <span style:grid-column="span {slot.spacer}"></span>
          {:else}
            <KeyButton definition={visibleKey(slot)} onPress={press} />
          {/if}
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .keypad {
    background: var(--color-keypad-bg);
    border-top: 1px solid var(--color-border);
  }

  .groups {
    display: grid;
    gap: var(--space-6);
    padding: var(--space-3);
  }

  .group {
    display: grid;
    gap: 6px;
    align-content: start;
  }

  @media (max-width: 560px) {
    .groups {
      gap: var(--space-2);
      padding: var(--space-2);
    }

    .group {
      gap: 4px;
    }
  }
</style>
