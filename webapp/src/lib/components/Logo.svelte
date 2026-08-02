<script lang="ts">
  let {
    size = 26,
    variant = "mark",
    class: cls = "",
  }: { size?: number; variant?: "mark" | "lockup"; class?: string } = $props();

  const alt = $derived(variant === "lockup" ? "Faradaystack" : "");
</script>

{#if variant === "lockup"}
  <span class="lockup {cls}" aria-label={alt} style:--logo-size={`${size}px`}>
    <img src="/logo-mark.svg" alt="" height={size} />
    <span>faradaystack</span>
  </span>
{:else}
  <img src="/logo-mark.svg" {alt} height={size} class={cls} style="width: auto; display: block;" />
{/if}

<style>
  .lockup {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--logo-size) * 0.42);
    color: currentColor;
    font-size: calc(var(--logo-size) * 0.88);
    font-weight: 750;
    line-height: 1;
  }

  .lockup img {
    display: block;
    width: auto;
    height: var(--logo-size);
  }
</style>
