<script lang="ts">
  import Sparkline from "./Sparkline.svelte";

  interface Props {
    label: string;
    value: string;
    unit?: string;
    delta: string;
    direction: "up" | "down" | "muted";
    sub: string;
    spark: number[];
    sparkColor?: string;
  }
  let { label, value, unit, delta, direction, sub, spark, sparkColor = "var(--fa-accent)" }: Props = $props();
</script>

<div class="fa-kpi">
  <div class="fa-kpi-head"><span>{label}</span></div>
  <div class="fa-kpi-spark">
    <Sparkline data={spark} accent={sparkColor} width={84} height={28} />
  </div>
  <div class="fa-kpi-val">
    {value}{#if unit}<span class="fa-unit">{unit}</span>{/if}
  </div>
  <div class="fa-kpi-foot">
    <span class="fa-kpi-delta {direction}">
      {direction === "up" ? "▲" : direction === "down" ? "▼" : "—"}
      {delta}
    </span>
    <span>{sub}</span>
  </div>
</div>
