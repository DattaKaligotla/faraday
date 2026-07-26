<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    id,
    as = "span",
    class: className = "",
    style = "",
    children,
  }: {
    id: string;
    as?: string;
    class?: string;
    style?: string;
    children: Snippet;
  } = $props();
</script>

<svelte:element this={as} data-mod={id} class={className} {style}>
  {@render children()}
</svelte:element>
