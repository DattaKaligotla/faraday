<script lang="ts">
  import { toggleMode, mode } from "mode-watcher";
</script>

<button type="button" class="mode-toggle" onclick={toggleMode} title="Toggle theme" aria-label="Toggle theme">
  {#if mode.current === "dark"}
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      ><circle cx="12" cy="12" r="5" /><path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      /></svg
    >
  {:else}
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
      ><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg
    >
  {/if}
</button>

<style>
  .mode-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 30px;
    border: 1px solid var(--line-2);
    border-radius: 6px;
    background: transparent;
    color: var(--text-2);
    transition:
      color 0.12s,
      border-color 0.12s,
      background 0.12s;
  }
  .mode-toggle:hover {
    color: var(--accent);
    border-color: var(--accent-line);
    background: var(--bg-2);
  }
</style>
