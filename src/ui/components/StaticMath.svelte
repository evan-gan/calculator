<script lang="ts">
  import { onMount } from 'svelte';
  import { loadMathQuill } from '../mathquill/loadMathQuill';
  import type { MathQuillField } from '../mathquill/types';

  let { latex }: { latex: string } = $props();

  let host: HTMLSpanElement;
  let rendered = $state.raw<MathQuillField | null>(null);
  let failed = $state(false);

  onMount(() => {
    let destroyed = false;
    loadMathQuill()
      .then((mathQuill) => {
        if (!destroyed) rendered = mathQuill.StaticMath(host);
      })
      .catch((error: unknown) => {
        // Fall back to showing the raw LaTeX so the answer is still readable.
        console.error('StaticMath could not load MathQuill', error);
        failed = true;
      });
    return () => {
      destroyed = true;
    };
  });

  $effect(() => {
    rendered?.latex(latex);
  });
</script>

<span class="static-math" bind:this={host}>{failed ? latex : ''}</span>

<style>
  .static-math {
    font-size: inherit;
  }
</style>
