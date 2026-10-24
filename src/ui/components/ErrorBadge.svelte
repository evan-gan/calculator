<script lang="ts">
  import type { MathErrorCategory } from '../../math';

  interface Props {
    message: string;
    category: MathErrorCategory;
  }

  let { message, category }: Props = $props();

  const CATEGORY_LABELS: Record<MathErrorCategory, string> = {
    invalid: 'Error',
    unsupported: 'Not supported',
    unresolved: 'Not solvable yet',
  };

  // Each badge needs its own id so the tooltip can be announced for that button.
  const tooltipId = `error-tip-${Math.random().toString(36).slice(2)}`;

  let hovered = $state(false);
  let focused = $state(false);
  // A click keeps the message open (touch screens have no hover) until clicked again or elsewhere.
  let pinned = $state(false);
  let badge: HTMLSpanElement;

  const open = $derived(hovered || focused || pinned);

  $effect(() => {
    if (!pinned) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !badge.contains(event.target)) pinned = false;
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') pinned = false;
    };
    window.addEventListener('pointerdown', closeOnOutsidePress);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePress);
      window.removeEventListener('keydown', closeOnEscape);
    };
  });
</script>

<span class="badge {category}" bind:this={badge}>
  <!-- mousedown is cancelled so clicking the badge doesn't take focus away from the line being typed in. -->
  <button
    type="button"
    class="icon"
    aria-label="{CATEGORY_LABELS[category]}: {message}"
    aria-describedby={open ? tooltipId : undefined}
    aria-expanded={pinned}
    onmousedown={(event) => event.preventDefault()}
    onclick={() => (pinned = !pinned)}
    onmouseenter={() => (hovered = true)}
    onmouseleave={() => (hovered = false)}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
  >
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path class="triangle" d="M10.3 3.4a2 2 0 0 1 3.4 0l8.4 14.6A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.7-3L10.3 3.4Z" />
      <path class="mark" d="M12 8.5v5.5M12 17.2v.1" />
    </svg>
  </button>
  {#if open}
    <span class="tooltip" id={tooltipId} role="tooltip">{message}</span>
  {/if}
</span>

<style>
  .badge {
    position: relative;
    display: inline-flex;
  }

  .badge.invalid {
    --badge-color: var(--color-error);
  }

  .badge.unsupported {
    --badge-color: var(--color-warning);
  }

  .badge.unresolved {
    --badge-color: var(--color-text-muted);
  }

  .icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }

  .icon:hover,
  .icon[aria-expanded='true'] {
    background: var(--color-surface-muted);
  }

  .icon:focus-visible {
    outline: 2px solid var(--color-accent);
  }

  .triangle {
    fill: var(--badge-color);
  }

  .mark {
    stroke: var(--color-surface);
    stroke-width: 2.4;
    stroke-linecap: round;
  }

  /* Opens below the badge and to its left, since badges sit at the right edge of a row. */
  .tooltip {
    position: absolute;
    top: calc(100% + var(--space-1));
    right: 0;
    z-index: 10;
    width: max-content;
    max-width: min(280px, 80vw);
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--badge-color);
    border-radius: var(--radius-small);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: var(--font-size-small);
    line-height: 1.4;
    text-align: left;
    box-shadow: 0 4px 14px rgb(0 0 0 / 0.15);
  }
</style>
