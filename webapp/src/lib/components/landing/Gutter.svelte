<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    num,
    label,
    children,
  }: {
    num: string;
    label: string;
    children: Snippet;
  } = $props();
</script>

<div class="section-shell">
  <div class="section-index">
    <span>{num}</span>
    <span>{label}</span>
  </div>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  .section-shell {
    border-top: 1px solid var(--line);
    padding: 86px 0;
  }

  .section-index {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--accent);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: uppercase;
    margin-bottom: 28px;
  }

  .section-index span:first-child {
    color: var(--ink-4);
  }

  .body {
    min-width: 0;
  }

  @media (max-width: 700px) {
    .section-shell {
      padding: 56px 0;
    }

    .section-index {
      margin-bottom: 20px;
    }
  }
</style>
