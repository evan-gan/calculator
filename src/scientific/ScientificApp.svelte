<script lang="ts">
  import { evaluateWorkspace, type AngleMode } from '../math';
  import ExpressionList from '../ui/components/ExpressionList.svelte';
  import Keypad from '../ui/components/Keypad.svelte';
  import { LineEditor } from '../ui/state/lineEditor.svelte';
  import type { DisplayMode } from '../ui/types';

  const editor = new LineEditor('exact-calculator:lines');
  let displayMode = $state<DisplayMode>('exact');
  let angleMode = $state<AngleMode>('radians');
  let expressionList: ExpressionList;

  // Every line is evaluated together so lines can use each other's variables.
  const results = $derived(evaluateWorkspace(editor.lines.map((line) => line.latex), { angleMode }));
</script>

<div class="app">
  <main class="expressions" aria-label="Expression list">
    <ExpressionList
      bind:this={expressionList}
      {editor}
      results={results.map((line) => line.result)}
      mode={displayMode}
      placeholder="Try √72, 2x + 1 = 7, or a = 5 then use a in another line"
    />
  </main>

  <Keypad
    bind:angleMode
    bind:displayMode
    canUndo={editor.canUndo}
    canRedo={editor.canRedo}
    onAction={(action) => expressionList.handleKeyAction(action)}
    onUndo={() => editor.undo()}
    onRedo={() => editor.redo()}
    onClearAll={() => editor.clearAll()}
    appLink={{ href: 'graphing/', label: 'graph' }}
  />
</div>

<style>
  .app {
    height: 100dvh;
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
  }

  .expressions {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: var(--color-surface);
  }
</style>
