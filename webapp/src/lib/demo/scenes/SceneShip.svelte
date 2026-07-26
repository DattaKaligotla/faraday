<script lang="ts">
  import { getTimeline } from "../timeline.svelte";
  import { clamp, Easing } from "../easing";

  const START = 7.6;
  const END = 12.0;
  const tl = getTimeline();

  let active = $derived(tl.time >= START && tl.time <= END);
  let local = $derived(tl.time - START);

  let intro = $derived(clamp(local / 0.4, 0, 1));

  // request row
  let rowProg = $derived(clamp((local - 0.3) / 0.4, 0, 1));

  // agent activity log
  let logProg = $derived(clamp((local - 0.7) / 0.5, 0, 1));
  const LOG = "reading src/pricing.tsx · locating trial constant · drafting patch...";
  let logText = $derived(LOG.slice(0, Math.max(0, Math.floor((local - 0.8) * 36))));

  // diff
  let diffProg = $derived(Easing.easeOutQuart(clamp((local - 1.2) / 0.5, 0, 1)));

  // PR card
  let prProg = $derived(Easing.easeOutQuart(clamp((local - 1.8) / 0.5, 0, 1)));

  // checks
  const checks = [
    { name: "lint", at: 2.2 },
    { name: "typecheck", at: 2.4 },
    { name: "preview build", at: 2.6 },
  ];

  // status: running → merged
  let merged = $derived(local >= 3.0);
  let mergeFlash = $derived(clamp((local - 3.0) / 0.6, 0, 1) * (1 - clamp((local - 3.4) / 0.5, 0, 1)));

  let captionProg = $derived(clamp((local - 3.2) / 0.4, 0, 1));
  let outProg = $derived(clamp((local - 3.9) / 0.4, 0, 1));
</script>

{#if active}
  <div class="scene-ship" style:opacity={intro * (1 - outProg)}>
    <div class="grid-backdrop"></div>
    <div class="eyebrow">02 — Dashboard · req-1248</div>

    <div class="shell">
      <!-- sidebar -->
      <aside class="sidebar">
        <div class="brand">
          <span class="mark"></span>
          <span class="brand-name">faraday</span>
        </div>
        <nav>
          <span class="nav-item active">Requests</span>
          <span class="nav-item">Repos</span>
          <span class="nav-item">Team</span>
          <span class="nav-item">Settings</span>
        </nav>
        <div class="org">
          <span class="org-mark">A</span>
          <span class="org-name">acme.com</span>
        </div>
      </aside>

      <!-- main -->
      <div class="main">
        <div class="topbar">
          <div class="crumbs">
            <span class="crumb">Requests</span>
            <span class="crumb sep">/</span>
            <span class="crumb cur">req-1248</span>
          </div>
          <div class="topbar-pill">
            <span
              class="pill {merged ? 'applied' : 'running'}"
              style:box-shadow={mergeFlash > 0.1 ? `0 0 0 4px var(--green-soft)` : "none"}
            >
              <span class="dot"></span>{merged ? "merged" : "running"}
            </span>
          </div>
        </div>

        <div class="content">
          <!-- request row -->
          <div class="row" style:opacity={rowProg} style:transform="translateY({(1 - rowProg) * 8}px)">
            <div class="row-head">
              <span class="row-id">#1248</span>
              <span class="row-prompt">make the trial 30 days, please</span>
            </div>
            <div class="row-meta">
              <span>oscar@acme.com</span>
              <span class="dot-sep">·</span>
              <span>pricing.tsx</span>
              <span class="dot-sep">·</span>
              <span>just now</span>
            </div>
          </div>

          <!-- agent log -->
          <div class="log" style:opacity={logProg}>
            <span class="log-tag">agent</span>
            <span class="log-text"
              >{logText}{#if logText.length < LOG.length && local > 0.8}<span class="caret"></span>{/if}</span
            >
          </div>

          <div class="split">
            <!-- diff card -->
            <div class="card diff" style:opacity={diffProg} style:transform="translateY({(1 - diffProg) * 12}px)">
              <div class="card-head">
                <span class="path">src/pricing.tsx</span>
                <span class="hunk">@@ -42,7 +42,7 @@</span>
              </div>
              <div class="code">
                <div class="ctx">
                  <span class="ln">39</span><span class="t-mute">export const PRICING = {"{"}</span>
                </div>
                <div class="ctx"><span class="ln">40</span><span class="t-mute"> plan: 'pro',</span></div>
                <div class="line del">
                  <span class="ln">-41</span><span class="t"> trialDays: <span class="num">14</span>,</span>
                </div>
                <div class="line add">
                  <span class="ln">+41</span><span class="t"> trialDays: <span class="num">30</span>,</span>
                </div>
                <div class="ctx"><span class="ln">42</span><span class="t-mute"> features: [...],</span></div>
                <div class="ctx"><span class="ln">43</span><span class="t-mute">{"}"}</span></div>
              </div>
            </div>

            <!-- PR card -->
            <div class="card pr" style:opacity={prProg} style:transform="translateY({(1 - prProg) * 12}px)">
              <div class="card-head">
                <span class="pr-num">PR #1248</span>
                <span class="pill {merged ? 'applied' : 'pending'}">
                  <span class="dot"></span>{merged ? "merged" : "open"}
                </span>
              </div>
              <div class="pr-title">Extend trial to 30 days</div>
              <div class="pr-meta">faraday/req-1248 → main</div>
              <ul class="checks">
                {#each checks as c}
                  {@const done = local >= c.at}
                  <li style:opacity={done ? 1 : 0.35}>
                    <span class="check {done ? 'pass' : 'pending'}">
                      {#if done}
                        <svg viewBox="0 0 12 12" width="10" height="10"
                          ><path
                            d="M2 6 L5 9 L10 3"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          /></svg
                        >
                      {:else}
                        <span class="spinner"></span>
                      {/if}
                    </span>
                    <span class="check-name">{c.name}</span>
                    <span class="check-time">{done ? "0.4s" : "..."}</span>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="caption" style:opacity={captionProg}>shipped in 9.2s · zero engineer touches</div>
  </div>
{/if}

<style>
  .scene-ship {
    position: absolute;
    inset: 0;
    background: var(--bg);
  }
  .eyebrow {
    left: 64px;
    top: 56px;
  }
  .shell {
    position: absolute;
    left: 64px;
    top: 116px;
    right: 64px;
    bottom: 110px;
    display: flex;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--bg-1);
    overflow: hidden;
  }

  /* sidebar */
  .sidebar {
    width: 180px;
    border-right: 1px solid var(--line);
    background: var(--bg-2);
    display: flex;
    flex-direction: column;
    padding: 16px 12px;
    gap: 18px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
  }
  .brand .mark {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    background: var(--accent);
  }
  .brand-name {
    font-family: var(--serif);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .nav-item {
    font-family: var(--sans);
    font-size: 13px;
    color: var(--ink-3);
    padding: 6px 8px;
    border-radius: 4px;
  }
  .nav-item.active {
    color: var(--ink);
    background: var(--bg-3);
  }
  .org {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-top: 1px solid var(--line);
    padding-top: 14px;
  }
  .org-mark {
    width: 22px;
    height: 22px;
    background: var(--bg-3);
    color: var(--ink-2);
    border-radius: 4px;
    display: grid;
    place-items: center;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
  }
  .org-name {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-2);
  }

  /* main */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 24px;
    border-bottom: 1px solid var(--line);
  }
  .crumbs {
    display: flex;
    gap: 8px;
    font-family: var(--mono);
    font-size: 13px;
  }
  .crumb {
    color: var(--ink-3);
  }
  .crumb.cur {
    color: var(--ink);
  }
  .crumb.sep {
    color: var(--ink-4);
  }
  .topbar-pill .pill {
    transition: box-shadow 0.4s ease;
  }

  .content {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow: hidden;
  }

  .row {
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    border-radius: 8px;
    padding: 14px 18px;
  }
  .row-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }
  .row-id {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-3);
  }
  .row-prompt {
    font-family: var(--sans);
    font-size: 16px;
    color: var(--ink);
  }
  .row-meta {
    display: flex;
    gap: 8px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 6px;
  }
  .dot-sep {
    color: var(--ink-4);
  }

  .log {
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-2);
    transition: opacity 0.3s ease;
  }
  .log-tag {
    background: var(--accent-soft);
    color: var(--accent);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .split {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
    flex: 1;
    min-height: 0;
  }

  .card {
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    background: var(--bg-3);
    font-family: var(--mono);
    font-size: 12px;
  }
  .path {
    color: var(--ink-2);
  }
  .hunk {
    color: var(--ink-3);
    font-size: 11px;
  }

  .code {
    padding: 12px 0;
    font-family: var(--mono);
    font-size: 12.5px;
    line-height: 1.8;
    color: var(--ink-2);
    overflow: hidden;
  }
  .code .ctx,
  .code .line {
    display: flex;
    align-items: baseline;
    padding-left: 0;
  }
  .code .ln {
    display: inline-block;
    width: 44px;
    color: var(--ink-4);
    text-align: right;
    padding-right: 14px;
    user-select: none;
    flex: 0 0 auto;
  }
  .code .t-mute {
    color: var(--ink-3);
  }
  .code .t {
    color: var(--ink);
  }
  .code .num {
    color: var(--accent);
    font-weight: 600;
  }
  .code .line.del {
    background: rgba(255, 110, 110, 0.07);
    border-left: 2px solid #ff6e6e;
  }
  .code .line.add {
    background: rgba(108, 211, 108, 0.07);
    border-left: 2px solid var(--green);
  }

  .pr {
    padding: 0;
  }
  .pr-num {
    font-family: var(--mono);
    color: var(--ink-2);
  }
  .pr-title {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 600;
    color: var(--ink);
    padding: 14px 14px 4px;
  }
  .pr-meta {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-3);
    padding: 0 14px 14px;
  }
  .checks {
    list-style: none;
    margin: 0;
    padding: 6px 14px 14px;
    border-top: 1px solid var(--line);
  }
  .checks li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-2);
    transition: opacity 0.2s ease;
  }
  .check {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  .check.pass {
    background: var(--green-soft);
    color: var(--green);
  }
  .check.pending {
    background: var(--bg-3);
    color: var(--ink-3);
  }
  .spinner {
    width: 8px;
    height: 8px;
    border: 1.5px solid var(--ink-4);
    border-top-color: var(--ink-2);
    border-radius: 50%;
    animation: faraday-spin 0.8s linear infinite;
  }
  .check-time {
    margin-left: auto;
    color: var(--ink-3);
  }

  @keyframes faraday-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .caption {
    position: absolute;
    left: 64px;
    bottom: 56px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-3);
    letter-spacing: 0.04em;
    transition: opacity 0.3s ease;
  }
</style>
