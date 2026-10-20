<script lang="ts">
  import ControlButton from './ControlButton.svelte';

  interface Props {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    /** The viewport is locked in the settings. */
    disabled?: boolean;
  }

  let { onZoomIn, onZoomOut, onReset, disabled = false }: Props = $props();
</script>

<div class="zoom-controls">
  <ControlButton label="Zoom in" onClick={onZoomIn} {disabled}><path d="M12 5v14M5 12h14" /></ControlButton>
  <ControlButton label="Zoom out" onClick={onZoomOut} {disabled}><path d="M5 12h14" /></ControlButton>
  <ControlButton label="Reset view" onClick={onReset} {disabled}><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" /></ControlButton>
</div>

<style>
  .zoom-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
</style>
