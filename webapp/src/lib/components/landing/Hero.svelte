<script lang="ts">
  import Mod from "./Mod.svelte";

  const stages = [
    { label: "Enterprise state", detail: "systems, sites, teams" },
    { label: "RL environment", detail: "rewards, constraints, scenarios" },
    { label: "Autonomous system", detail: "train, evaluate, deploy" },
  ];

  const signals = ["Reward", "Constraint", "Scenario", "Human review"];

  const proofs = ["Production stays untouched", "Human handoffs included", "Decisions scored against KPIs"];
</script>

<section id="hero">
  <div class="gridlines" aria-hidden="true"></div>

  <div class="hero-grid">
    <div class="copy">
      <div class="eyebrow">RL environments for enterprise operations</div>
      <h1 data-mod="h1">Build the training environments where enterprise autonomy learns.</h1>
      <Mod id="hero-sub" as="p" class="sub">
        Faraday builds reinforcement-learning environments that mirror Fortune 500 operations, so AI agents and robots
        can train, fail, and improve before deployment.
      </Mod>
      <Mod id="hero-sub-2" as="p" class="sub secondary">
        Model workflows. Generate scenarios. Score decisions. Keep production untouched.
      </Mod>

      <div class="actions">
        <a href="/request-access" class="cta-primary">Request access</a>
        <a href="#model" class="cta-secondary">See how it works</a>
      </div>
    </div>

    <div class="simulator" aria-label="Enterprise reinforcement learning environment">
      <div class="sim-top">
        <span>Faraday RL environment</span>
        <div class="status">
          <i></i>
          Training mode
        </div>
      </div>

      <div class="model">
        {#each stages as stage}
          <div class="stage">
            <span>{stage.label}</span>
            <strong>{stage.detail}</strong>
          </div>
        {/each}
      </div>

      <div class="signal-plane">
        <div class="axis axis-a"></div>
        <div class="axis axis-b"></div>
        <div class="axis axis-c"></div>
        {#each signals as signal, i}
          <div class="signal signal-{i + 1}">{signal}</div>
        {/each}
        <div class="core">
          <span>Enterprise gym</span>
          <strong>ready for training</strong>
        </div>
      </div>

      <div class="metrics">
        <div>
          <span>Scenario coverage</span>
          <strong>94%</strong>
        </div>
        <div>
          <span>KPI alignment</span>
          <strong>99%</strong>
        </div>
        <div>
          <span>Production access</span>
          <strong>0</strong>
        </div>
      </div>
    </div>
  </div>

  <div class="proofs">
    {#each proofs as proof}
      <span>{proof}</span>
    {/each}
  </div>
</section>

<style>
  section {
    position: relative;
    isolation: isolate;
    min-height: calc(100vh - 96px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 72px 0 34px;
    overflow: hidden;
  }

  .gridlines {
    position: absolute;
    inset: 0 calc(50% - 50vw) auto;
    height: 100%;
    z-index: -1;
    background-color: var(--bg);
    background-image:
      linear-gradient(90deg, var(--line) 1px, transparent 1px), linear-gradient(var(--line) 1px, transparent 1px);
    background-size:
      56px 56px,
      56px 56px;
    opacity: 0.72;
  }

  .hero-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.93fr) minmax(420px, 0.82fr);
    gap: 56px;
    align-items: center;
    padding: 34px 0 52px;
  }

  .copy {
    max-width: 720px;
  }

  .eyebrow {
    color: var(--accent);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 24px;
  }

  h1 {
    font-family: var(--serif);
    font-size: clamp(48px, 7vw, 88px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 0.95;
    text-wrap: balance;
    margin-bottom: 28px;
  }

  :global(.sub) {
    color: var(--ink-2);
    font-size: 18px;
    line-height: 1.55;
    max-width: 660px;
    margin-bottom: 12px;
  }

  :global(.sub.secondary) {
    color: var(--ink-3);
    margin-bottom: 34px;
  }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .cta-primary,
  .cta-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    border-radius: 4px;
    padding: 0 19px;
    font-weight: 600;
    font-size: 14px;
    font-family: var(--mono);
  }

  .cta-primary {
    color: #0c0c0c;
    background: var(--accent);
    box-shadow: 0 12px 40px -10px rgba(255, 107, 26, 0.6);
  }

  .cta-secondary {
    color: var(--ink);
    border: 1px solid var(--line-3);
    background: var(--surface);
  }

  .simulator {
    position: relative;
    overflow: hidden;
    min-height: 610px;
    border: 1px solid var(--line-3);
    border-radius: 8px;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.055) 1px, transparent 1px),
      linear-gradient(rgba(255, 255, 255, 0.055) 1px, transparent 1px), #0c0c0c;
    background-size:
      34px 34px,
      34px 34px;
    box-shadow:
      0 36px 90px rgba(0, 0, 0, 0.36),
      inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }

  .simulator::after {
    content: "";
    position: absolute;
    inset: 0;
    border-left: 1px solid rgba(255, 107, 26, 0.28);
    border-right: 1px solid rgba(108, 182, 255, 0.16);
    pointer-events: none;
  }

  .sim-top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--accent);
  }

  .status i {
    width: 7px;
    height: 7px;
    background: var(--accent);
    border-radius: 999px;
    box-shadow: 0 0 18px rgba(255, 107, 26, 0.9);
  }

  .model {
    position: relative;
    z-index: 1;
    display: grid;
    gap: 10px;
    padding: 0 18px;
  }

  .stage {
    display: grid;
    grid-template-columns: 0.64fr 1fr;
    gap: 14px;
    align-items: center;
    border: 1px solid var(--line-3);
    border-radius: 8px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.045);
    color: #fff;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .stage span {
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .stage strong {
    font-size: 15px;
    font-weight: 760;
  }

  .signal-plane {
    position: relative;
    z-index: 1;
    height: 290px;
    margin: 18px;
    border: 1px solid var(--line-3);
    border-radius: 8px;
    background:
      linear-gradient(90deg, rgba(255, 107, 26, 0.12) 1px, transparent 1px),
      linear-gradient(rgba(255, 107, 26, 0.1) 1px, transparent 1px), rgba(12, 12, 12, 0.56);
    background-size: 38px 38px;
  }

  .axis {
    position: absolute;
    height: 1px;
    background: rgba(255, 107, 26, 0.56);
    transform-origin: left center;
  }

  .axis-a {
    left: 11%;
    top: 26%;
    width: 76%;
    transform: rotate(18deg);
  }

  .axis-b {
    left: 10%;
    top: 72%;
    width: 72%;
    background: rgba(108, 182, 255, 0.5);
    transform: rotate(-18deg);
  }

  .axis-c {
    left: 20%;
    top: 49%;
    width: 62%;
    background: rgba(232, 196, 104, 0.46);
  }

  .signal {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    padding: 8px 11px;
    background: var(--surface);
    color: var(--ink-2);
    font-size: 12px;
    font-weight: 760;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
  }

  .signal-1 {
    left: 8%;
    top: 19%;
  }

  .signal-2 {
    right: 10%;
    top: 17%;
  }

  .signal-3 {
    left: 13%;
    bottom: 18%;
  }

  .signal-4 {
    right: 8%;
    bottom: 15%;
  }

  .core {
    position: absolute;
    left: 50%;
    top: 50%;
    width: min(250px, 64%);
    transform: translate(-50%, -50%);
    border: 1px solid rgba(255, 107, 26, 0.55);
    border-radius: 8px;
    background: #101010;
    color: var(--ink);
    padding: 20px;
    box-shadow: 0 28px 68px rgba(0, 0, 0, 0.42);
  }

  .core span {
    display: block;
    color: var(--accent);
    font-size: 12px;
    font-family: var(--mono);
    font-weight: 600;
    margin-bottom: 12px;
  }

  .core strong {
    display: block;
    font-family: var(--serif);
    font-size: clamp(26px, 3vw, 38px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1;
  }

  .metrics {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    margin: 0 18px 18px;
    overflow: hidden;
    border: 1px solid var(--line-3);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
  }

  .metrics div {
    padding: 16px;
    background: rgba(255, 255, 255, 0.04);
    color: #fff;
  }

  .metrics span {
    display: block;
    color: var(--ink-3);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .metrics strong {
    font-size: 26px;
    font-weight: 760;
  }

  .proofs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1px;
    overflow: hidden;
    border: 1px solid var(--line-2);
    border-radius: 8px;
    background: var(--line);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }

  .proofs span {
    color: var(--ink-2);
    background: rgba(255, 255, 255, 0.035);
    padding: 18px;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
  }

  @media (max-width: 980px) {
    .hero-grid {
      grid-template-columns: 1fr;
      gap: 32px;
    }
  }

  @media (max-width: 700px) {
    section {
      min-height: auto;
      padding: 48px 0 28px;
    }

    .hero-grid {
      padding-top: 16px;
    }

    h1 {
      font-size: 48px;
    }

    :global(.sub) {
      font-size: 17px;
    }

    .simulator {
      min-height: 540px;
    }

    .stage,
    .metrics {
      grid-template-columns: 1fr;
    }

    .proofs {
      grid-template-columns: 1fr;
    }
  }
</style>
