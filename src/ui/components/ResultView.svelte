<script lang="ts">
  import StaticMath from './StaticMath.svelte';
  import SolutionLines from './SolutionLines.svelte';
  import type { CalculationResult } from '../../math';
  import type { DisplayMode } from '../types';

  interface Props {
    result: CalculationResult;
    mode: DisplayMode;
    /** Show errors in muted text: while typing, half-finished input is expected, not alarming. */
    quietErrors?: boolean;
  }

  // Renders any calculation result; used by the input row and by history rows.
  let { result, mode, quietErrors = false }: Props = $props();
</script>

<div class="result-view">
  {#if result.kind === 'error'}
    <p class="error" class:quiet={quietErrors} role="status">{result.message}</p>
  {:else if result.kind === 'value'}
    <div class="answer"><StaticMath latex={result.result[mode]} /></div>
  {:else if result.kind === 'simplified'}
    <div class="answer"><StaticMath latex={result.result[mode]} /></div>
    {#if result.roots}
      <p class="label">Equals 0 when</p>
      <SolutionLines solutions={result.roots} {mode} />
    {/if}
  {:else if result.kind === 'solved'}
    <SolutionLines solutions={result.solutions} {mode} />
  {:else if result.kind === 'truth'}
    <p class="truth" class:is-true={result.isTrue}>{result.isTrue ? 'True' : 'False'}</p>
  {/if}
</div>

<style>
  /* Answers sit on the right of each row, like a classic calculator tape. */
  .result-view {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    gap: var(--space-2);
    min-width: 0;
    max-width: 100%;
  }

  .answer {
    font-size: var(--font-size-math);
    overflow-x: auto;
  }

  .label {
    margin: 0;
    color: var(--color-text-muted);
    font-size: var(--font-size-small);
  }

  .error {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-small);
    background: var(--color-error-soft);
    color: var(--color-error);
    font-size: var(--font-size-small);
  }

  .error.quiet {
    padding: 0;
    background: none;
    color: var(--color-text-muted);
  }

  .truth {
    margin: 0;
    padding: var(--space-1) var(--space-3);
    border-radius: 999px;
    font-weight: 600;
    background: var(--color-error-soft);
    color: var(--color-error);
  }

  .truth.is-true {
    background: var(--color-success-soft);
    color: var(--color-success);
  }
</style>
