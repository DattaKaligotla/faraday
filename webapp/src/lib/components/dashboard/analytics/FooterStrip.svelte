<script lang="ts">
  interface Props {
    rangeLabel: string;
    generatedAtMs: number;
  }
  let { rangeLabel, generatedAtMs }: Props = $props();

  function ago(ms: number): string {
    const diff = Math.max(0, Date.now() - ms);
    const seconds = Math.round(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.round(minutes / 60)}h ago`;
  }
</script>

<div class="fa-foot-strip">
  <span class="fa-live-dot"></span>
  <span>cached {ago(generatedAtMs)}</span>
  <span class="fa-foot-sep">│</span>
  <span>data window: rolling {rangeLabel}</span>
  <span class="fa-foot-sep">│</span>
  <span>tz: utc</span>
</div>
