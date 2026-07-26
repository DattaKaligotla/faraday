<script lang="ts">
  interface Props {
    msg: string;
    onDone: () => void;
  }
  let { msg, onDone }: Props = $props();

  $effect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  });
</script>

{#if msg}
  <div class="toast"><span class="toast-bullet">›</span>{msg}</div>
{/if}
