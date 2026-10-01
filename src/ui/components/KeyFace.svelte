<script lang="ts">
  import type { KeyLabel } from '../keypad/keys';

  // Draws a key's label: plain text, a base with scripts (a², sin⁻¹, ⁿ√, logₐ) or a small fraction.
  let { label }: { label: KeyLabel } = $props();
</script>

{#if typeof label === 'string'}
  <span>{label}</span>
{:else if 'numerator' in label}
  <span class="fraction">
    <span class="part italic">{label.numerator}</span>
    <span class="part italic denominator">{label.denominator}</span>
  </span>
{:else}
  <span class="scripted">
    {#if label.preSup}<sup class="pre">{label.preSup}</sup>{/if}<span class:italic={label.italic}>{label.base}</span
    >{#if label.sup}<sup class:italic={label.italic}>{label.sup}</sup>{/if}{#if label.sub}<sub class="italic">{label.sub}</sub>{/if}
  </span>
{/if}

<style>
  .italic {
    font-style: italic;
  }

  sup,
  sub {
    font-size: 0.65em;
  }

  .pre {
    margin-right: -0.05em;
    vertical-align: 0.9em;
  }

  .fraction {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.8em;
    line-height: 1;
  }

  .denominator {
    border-top: 1px solid currentColor;
    padding-top: 1px;
  }
</style>
