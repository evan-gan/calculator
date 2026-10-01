<script lang="ts">
  import StaticMath from './StaticMath.svelte';
  import type { SolutionDisplay } from '../../math';
  import type { DisplayMode } from '../types';

  let { solutions, mode }: { solutions: SolutionDisplay; mode: DisplayMode } = $props();

  const lines = $derived(mode === 'exact' ? solutions.exactLines : solutions.decimalLines);
</script>

<div class="solution-lines">
  {#each lines as line (line)}
    <div class="line"><StaticMath latex={line} /></div>
  {/each}
  {#each solutions.notes as note (note)}
    <p class="note">{note}</p>
  {/each}
</div>

<style>
  .solution-lines {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    max-width: 100%;
  }

  .line {
    font-size: var(--font-size-math);
    overflow-x: auto;
    max-width: 100%;
  }

  .note {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-small);
  }
</style>
