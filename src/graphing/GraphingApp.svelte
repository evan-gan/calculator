<script lang="ts">
  import GraphCanvas from './components/GraphCanvas.svelte';
  import KeypadToggle from './components/KeypadToggle.svelte';
  import { curveColorIndex, curveColorVariable } from './render/graphTheme';
  import { loadGraphSettings, saveGraphSettings } from './state/graphSettings';
  import type { GraphCurve } from './types';
  import { evaluateGraphWorkspace, type AngleMode } from '../math';
  import ExpressionList from '../ui/components/ExpressionList.svelte';
  import Keypad from '../ui/components/Keypad.svelte';
  import { LineEditor } from '../ui/state/lineEditor.svelte';
  import type { DisplayMode, ExpressionLine } from '../ui/types';

  const editor = new LineEditor('exact-calculator:graph-lines');
  let displayMode = $state<DisplayMode>('exact');
  let angleMode = $state<AngleMode>('radians');
  let graphSettings = $state(loadGraphSettings());
  $effect(() => saveGraphSettings($state.snapshot(graphSettings)));
  // Hidden by default so the graph gets the room; phones then use their own keyboard.
  let keypadShown = $state(false);
  let expressionList: ExpressionList;

  const results = $derived(evaluateGraphWorkspace(editor.lines.map((line) => line.latex), { angleMode }));

  const curves = $derived(
    editor.lines.flatMap((line, index): GraphCurve[] => {
      const plot = results[index]?.plot;
      return plot ? [{ id: line.id, colorIndex: curveColorIndex(line.id), plot }] : [];
    }),
  );
</script>

{#snippet curveSwatch(line: ExpressionLine, index: number)}
  <span
    class="swatch"
    class:visible={results[index]?.plot}
    style:background={curveColorVariable(line.id)}
    aria-hidden="true"
  ></span>
{/snippet}

<div class="graphing-app" class:keypad-shown={keypadShown}>
  <aside class="sidebar" aria-label="Equations">
    <header class="sidebar-bar">
      <a class="app-link" href="../">calculator</a>
      <KeypadToggle bind:shown={keypadShown} />
    </header>
    <div class="expressions">
      <ExpressionList
        bind:this={expressionList}
        {editor}
        results={results.map((line) => line.result)}
        mode={displayMode}
        placeholder="Try y = x², x² + y² = 25, or a = 2 then y = ax"
        allowSystemKeyboard={!keypadShown}
        marker={curveSwatch}
      />
    </div>
  </aside>

  <section class="graph" aria-label="Graph">
    <GraphCanvas {curves} bind:settings={graphSettings} bind:angleMode />
  </section>

  {#if keypadShown}
    <div class="keypad">
      <Keypad
        bind:angleMode
        bind:displayMode
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onAction={(action) => expressionList.handleKeyAction(action)}
        onUndo={() => editor.undo()}
        onRedo={() => editor.redo()}
        onClearAll={() => editor.clearAll()}
      />
    </div>
  {/if}
</div>

<style>
  .graphing-app {
    height: 100dvh;
    display: grid;
    grid-template-columns: minmax(300px, 400px) 1fr;
    grid-template-rows: minmax(0, 1fr);
    grid-template-areas: 'sidebar graph';
    background: var(--color-surface);
  }

  .graphing-app.keypad-shown {
    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-areas:
      'sidebar graph'
      'keypad keypad';
  }

  .sidebar {
    grid-area: sidebar;
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--color-border);
  }

  .sidebar-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-keypad-bg);
  }

  .app-link {
    color: var(--color-text-muted);
    text-decoration: none;
    font-size: 1.05rem;
  }

  .app-link:hover {
    color: var(--color-text);
  }

  .expressions {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .graph {
    grid-area: graph;
    min-width: 0;
    min-height: 0;
  }

  .keypad {
    grid-area: keypad;
  }

  /* Color of the line's curve; space is kept even when it isn't graphed so inputs line up. */
  .swatch {
    flex: none;
    width: 14px;
    height: 14px;
    margin-right: calc(var(--space-2) - var(--space-5));
    border-radius: 50%;
    visibility: hidden;
  }

  .swatch.visible {
    visibility: visible;
  }

  /* Phones: graph on top, equations below, keypad (when shown) at the bottom. */
  @media (max-width: 720px) {
    .graphing-app,
    .graphing-app.keypad-shown {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: 45dvh minmax(0, 1fr) auto;
      grid-template-areas: 'graph' 'sidebar' 'keypad';
    }

    .graphing-app.keypad-shown {
      grid-template-rows: 32dvh minmax(0, 1fr) auto;
    }

    .sidebar {
      border-right: none;
      border-top: 1px solid var(--color-border);
    }
  }
</style>
