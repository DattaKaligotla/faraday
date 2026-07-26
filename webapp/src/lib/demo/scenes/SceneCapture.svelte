<script lang="ts">
  import { getTimeline } from "../timeline.svelte";
  import { clamp, Easing } from "../easing";

  const START = 2.6;
  const END = 7.6;
  const tl = getTimeline();

  let active = $derived(tl.time >= START && tl.time <= END);
  let local = $derived(tl.time - START);

  // panel slides in
  let panelProg = $derived(clamp(local / 0.6, 0, 1));
  let panelEase = $derived(Easing.easeOutQuart(panelProg));

  // typing the user prompt
  const PROMPT = "make the trial 30 days, please";
  const CPS = 28;
  let typeStart = 0.7;
  let typed = $derived(PROMPT.slice(0, Math.max(0, Math.floor((local - typeStart) * CPS))));
  let typingDone = $derived(typed.length >= PROMPT.length);

  // send pulse
  let sendPulse = $derived(clamp((local - 2.1) / 0.4, 0, 1));
  let sent = $derived(local >= 2.1);

  // agent response begins
  let agentTextStart = 2.5;
  const AGENT_REPLY = "Looking at the pricing card. I'll update the trial length.";
  let agentTyped = $derived(AGENT_REPLY.slice(0, Math.max(0, Math.floor((local - agentTextStart) * 32))));

  // tool chip appears
  let chipProg = $derived(clamp((local - 3.4) / 0.5, 0, 1));

  // pill flips queued → running
  let pillState = $derived(local < 4.2 ? "queued" : "running");
  let pillFlash = $derived(clamp((local - 4.0) / 0.4, 0, 1));

  // app card gets a soft highlight when the agent "looks" at it
  let appHighlight = $derived(clamp((local - 2.6) / 0.3, 0, 1) * (1 - clamp((local - 4.4) / 0.6, 0, 1)));

  // out
  let outProg = $derived(clamp((local - 4.6) / 0.4, 0, 1));
  let intro = $derived(clamp(local / 0.4, 0, 1));
</script>

{#if active}
  <div class="scene-capture" style:opacity={intro * (1 - outProg)}>
    <div class="grid-backdrop"></div>

    <div class="eyebrow">01 — Customer · Forge widget</div>

    <div class="layout">
      <!-- mock customer app -->
      <div class="app" class:lit={appHighlight > 0.3}>
        <div class="app-chrome">
          <span class="dot r"></span>
          <span class="dot y"></span>
          <span class="dot g"></span>
          <span class="url">acme.com / pricing</span>
        </div>
        <div class="app-body">
          <div class="brand">Acme · Billing</div>
          <h2>Pick a plan</h2>
          <div class="plan-card">
            <div class="plan-head">
              <span class="plan-name">Pro</span>
              <span class="plan-price">$49<span class="sub">/mo</span></span>
            </div>
            <ul>
              <li>Unlimited projects</li>
              <li>Priority support</li>
              <li><span class="trial">14-day</span> free trial</li>
            </ul>
            <button class="cta">Start free trial</button>
          </div>
        </div>
      </div>

      <!-- forge widget -->
      <div class="widget" style:transform="translateX({(1 - panelEase) * 80}px)" style:opacity={panelEase}>
        <div class="widget-head">
          <div class="widget-brand">
            <span class="mark"></span>
            <span class="name">faraday · forge</span>
          </div>
          <span class="pill {pillState}" style:opacity={local > 1.9 ? 1 : 0}>
            <span class="dot"></span>{pillState}
          </span>
        </div>

        <div class="thread">
          {#if sent}
            <div class="msg user">
              <div class="bubble">{PROMPT}</div>
            </div>
          {/if}

          {#if local > agentTextStart - 0.1}
            <div class="msg agent" style:opacity={clamp((local - agentTextStart + 0.2) / 0.3, 0, 1)}>
              <div class="agent-name">forge</div>
              <div class="agent-body">{agentTyped}</div>
              {#if chipProg > 0}
                <div class="tool-chip" style:opacity={chipProg} style:transform="translateY({(1 - chipProg) * 6}px)">
                  <span class="chip-dot"></span>
                  <span class="chip-tool">editValue</span>
                  <span class="chip-arrow">→</span>
                  <span class="chip-target">trial.days · 14 → 30</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="composer" style:box-shadow={typingDone && !sendPulse ? "0 0 0 1px var(--accent-line)" : "none"}>
          <div class="input">
            {#if sent}
              <span class="ph">ask forge…</span>
            {:else if typed.length === 0 && local < typeStart}
              <span class="ph">ask forge…</span>
            {:else}
              {typed}{#if !typingDone}<span class="caret"></span>{/if}
            {/if}
          </div>
          <button class="send" class:pulse={sendPulse > 0.5} aria-label="send">
            <svg viewBox="0 0 16 16" width="14" height="14"
              ><path
                d="M2 8 L13 8 M9 4 L13 8 L9 12"
                stroke="currentColor"
                stroke-width="1.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              /></svg
            >
          </button>
        </div>
      </div>
    </div>

    <div class="caption" style:opacity={local > 4.0 && local < 4.6 ? 1 : 0}>forwarded to your dashboard · req-1248</div>
  </div>
{/if}

<style>
  .scene-capture {
    position: absolute;
    inset: 0;
    background: var(--bg);
  }
  .eyebrow {
    left: 64px;
    top: 56px;
  }
  .layout {
    position: absolute;
    left: 64px;
    top: 116px;
    right: 64px;
    bottom: 110px;
    display: flex;
    gap: 28px;
  }

  /* customer app */
  .app {
    flex: 1.4;
    background: var(--bg-1);
    border: 1px solid var(--line);
    border-radius: 10px;
    overflow: hidden;
    transition: box-shadow 0.4s ease;
  }
  .app.lit {
    box-shadow:
      0 0 0 1px var(--accent-line),
      0 0 60px var(--accent-soft);
  }
  .app-chrome {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    background: var(--bg-2);
  }
  .app-chrome .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--line-3);
  }
  .app-chrome .url {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-3);
    margin-left: 12px;
  }
  .app-body {
    padding: 48px 56px;
  }
  .brand {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-bottom: 18px;
  }
  .app-body h2 {
    font-family: var(--serif);
    font-size: 38px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 0 0 28px;
  }
  .plan-card {
    border: 1px solid var(--line-2);
    border-radius: 10px;
    padding: 24px 26px;
    background: var(--bg-2);
    max-width: 380px;
  }
  .plan-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .plan-name {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 600;
  }
  .plan-price {
    font-family: var(--mono);
    font-size: 26px;
    font-weight: 600;
    color: var(--ink);
  }
  .plan-price .sub {
    font-size: 14px;
    color: var(--ink-3);
    margin-left: 2px;
  }
  .plan-card ul {
    list-style: none;
    padding: 0;
    margin: 18px 0 22px;
  }
  .plan-card li {
    font-size: 14px;
    color: var(--ink-2);
    padding: 7px 0;
    border-bottom: 1px solid var(--line);
  }
  .plan-card li:last-child {
    border-bottom: none;
  }
  .trial {
    color: var(--accent);
    font-family: var(--mono);
    font-weight: 500;
  }
  .cta {
    width: 100%;
    background: var(--accent);
    color: #000;
    padding: 11px;
    border-radius: 6px;
    font-family: var(--sans);
    font-weight: 600;
    font-size: 14px;
    border: none;
    cursor: default;
  }

  /* widget */
  .widget {
    flex: 1;
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 18px 60px rgba(0, 0, 0, 0.4);
  }
  .widget-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--line);
  }
  .widget-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-2);
  }
  .widget-brand .mark {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--accent);
  }
  .thread {
    flex: 1;
    padding: 22px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .msg.user {
    align-self: flex-end;
    max-width: 82%;
  }
  .msg.user .bubble {
    background: var(--bg-3);
    color: var(--ink);
    padding: 10px 14px;
    border-radius: 14px 14px 4px 14px;
    font-size: 14px;
    line-height: 1.45;
  }
  .msg.agent {
    max-width: 92%;
  }
  .agent-name {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-3);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }
  .agent-body {
    font-size: 14px;
    color: var(--ink-2);
    line-height: 1.5;
  }
  .tool-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    padding: 6px 10px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }
  .chip-tool {
    color: var(--ink);
  }
  .chip-arrow {
    color: var(--ink-4);
  }
  .chip-target {
    color: var(--ink-3);
  }

  .composer {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-top: 1px solid var(--line);
    background: var(--bg-2);
    border-radius: 0;
    transition: box-shadow 0.2s ease;
  }
  .composer .input {
    flex: 1;
    font-family: var(--sans);
    font-size: 14px;
    color: var(--ink);
    min-height: 18px;
  }
  .composer .input .ph {
    color: var(--ink-4);
  }
  .send {
    width: 30px;
    height: 30px;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .send.pulse {
    background: var(--accent);
    color: #000;
    box-shadow: 0 0 0 4px var(--accent-soft);
  }

  .caption {
    position: absolute;
    left: 64px;
    bottom: 56px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--ink-3);
    letter-spacing: 0.04em;
    transition: opacity 0.4s ease;
  }
</style>
