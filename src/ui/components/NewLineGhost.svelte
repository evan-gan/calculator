<script lang="ts">
  let { onAdd }: { onAdd: () => void } = $props();
</script>

<!-- A faded hint of the next row under the list: pressing it adds a real line. -->
<button type="button" class="ghost" aria-label="Add a line" onmousedown={(event) => event.preventDefault()} onclick={onAdd}>
  <span class="plus" aria-hidden="true">+</span>
</button>

<style>
  .ghost {
    display: flex;
    align-items: center;
    width: 100%;
    height: 64px;
    padding: 0 var(--space-5);
    border: none;
    box-shadow: inset 4px 0 0 var(--color-row-border);
    background: var(--color-surface-muted);
    color: var(--color-text-muted);
    cursor: pointer;
    opacity: 0.7;
    /* Fades out toward the bottom so it reads as "room for another line", not as a line. */
    mask-image: linear-gradient(to bottom, black 20%, transparent);
    transition: opacity 120ms ease;
  }

  .ghost:hover,
  .ghost:focus-visible {
    opacity: 1;
  }

  .ghost:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .plus {
    font-size: 1.4rem;
    line-height: 1;
  }
</style>
