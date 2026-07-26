<script lang="ts">
  import { getTimeline } from "../timeline.svelte";
  import { clamp } from "../easing";

  const START = 0;
  const END = 2.6;
  const tl = getTimeline();

  let active = $derived(tl.time >= START && tl.time <= END);
  let local = $derived(tl.time - START);

  let logoProg = $derived(clamp(local / 1.0, 0, 1));
  let eyebrowProg = $derived(clamp((local - 0.4) / 0.5, 0, 1));
  let titleProg = $derived(clamp((local - 0.7) / 0.6, 0, 1));
  let ruleProg = $derived(clamp((local - 1.3) / 0.5, 0, 1));
  let subProg = $derived(clamp((local - 1.5) / 0.5, 0, 1));
  let outProg = $derived(clamp((local - 2.2) / 0.4, 0, 1));

  // 8 outer cells of a 3x3 logo grid; the 9th (center) is the orange square.
  const cells = [
    [10, 10],
    [26, 10],
    [42, 10],
    [10, 26],
    [42, 26],
    [10, 42],
    [26, 42],
    [42, 42],
  ] as const;

  function cellOpacity(prog: number, i: number) {
    return clamp(prog * cells.length - i, 0, 1);
  }
  let centerOp = $derived(clamp(logoProg * cells.length - cells.length + 1, 0, 1));
</script>

{#if active}
  <div class="scene-title" style:opacity={1 - outProg}>
    <div class="glow" style:opacity={logoProg * 0.9}></div>

    <div
      class="logo"
      style:opacity={logoProg}
      style:transform="translateY({(1 - logoProg) * 12}px) scale({0.92 + logoProg * 0.08})"
    >
      {#each cells as [x, y], i}
        {@const op = cellOpacity(logoProg, i)}
        <span
          class="cell"
          style:left="{x}px"
          style:top="{y}px"
          style:opacity={op}
          style:transform="scale({0.6 + op * 0.4})"
        ></span>
      {/each}
      <span class="center" style:opacity={centerOp} style:transform="scale({0.6 + centerOp * 0.4})"></span>
    </div>

    <div
      class="title"
      style:opacity={Math.max(eyebrowProg, titleProg)}
      style:transform="translateY({(1 - Math.max(eyebrowProg, titleProg)) * 14}px)"
    >
      <span class="muted">Watch a request </span>
      <span class="emph" style:opacity={titleProg}>become a PR</span>
    </div>

    <div class="rule" style:width="{280 * ruleProg}px" style:opacity={ruleProg}></div>

    <div class="sub" style:opacity={subProg} style:transform="translateY({(1 - subProg) * 6}px)">
      from a customer's keystroke to merged code
    </div>
  </div>
{/if}

<style>
  .scene-title {
    position: absolute;
    inset: 0;
    background: var(--bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .glow {
    position: absolute;
    left: 50%;
    top: 42%;
    width: 720px;
    height: 720px;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, var(--accent-soft) 0%, transparent 60%);
    pointer-events: none;
  }
  .logo {
    position: relative;
    width: 64px;
    height: 64px;
    background: #f6f4ef;
    border-radius: 14px;
    overflow: hidden;
    transform: scale(1.5);
    transform-origin: center;
    margin-bottom: 56px;
  }
  .logo .cell {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 2px;
    background: #d3cec3;
    transform-origin: center;
  }
  .logo .center {
    position: absolute;
    left: 22px;
    top: 22px;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    background: var(--accent);
    transform-origin: center;
  }
  .title {
    font-family: var(--serif);
    font-size: 76px;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.05;
    text-align: center;
    color: var(--ink);
  }
  .title .muted {
    color: var(--ink-2);
    font-weight: 500;
  }
  .title .emph {
    color: var(--accent);
    font-style: italic;
    font-weight: 600;
  }
  .rule {
    height: 1px;
    background: var(--line-3);
    margin-top: 28px;
    margin-bottom: 18px;
  }
  .sub {
    font-family: var(--sans);
    font-size: 18px;
    color: var(--ink-3);
    letter-spacing: -0.005em;
  }
</style>
