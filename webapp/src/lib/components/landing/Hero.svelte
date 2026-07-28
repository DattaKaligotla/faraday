<script lang="ts">
  import { manufacturingScenario } from "$lib/data/manufacturingScenario";
  import Mod from "./Mod.svelte";
</script>

<section id="hero">
  <div class="gridlines" aria-hidden="true"></div>

  <div class="hero-grid">
    <div class="copy">
      <div class="eyebrow">Faraday Cage</div>
      <h1 data-mod="h1">Simulation before production.</h1>
      <Mod id="hero-sub" as="p" class="sub">
        We build private environments where AI agents learn how an enterprise actually operates before they get access
        to real systems.
      </Mod>

      <div class="actions">
        <a href="/request-access" class="cta-primary">Request access</a>
      </div>
    </div>

    <div class="simulator" aria-label="Automotive assembly plant simulation environment">
      <div class="sim-top">
        <div class="sim-title">
          <span>{manufacturingScenario.plant}</span>
          <small>{manufacturingScenario.evaluation}</small>
        </div>
        <div class="status">
          <i></i>
          Evaluation complete
        </div>
      </div>

      <div class="environment-map">
        <div class="map-meta">
          <span>Operational replica</span>
          <span>{manufacturingScenario.scenarioId}</span>
        </div>

        <div class="connection connection-a"></div>
        <div class="connection connection-b"></div>
        <div class="connection connection-c"></div>
        <div class="connection connection-d"></div>

        {#each manufacturingScenario.sources as source}
          <div class="source-node {source.position}">
            <span>{source.label}</span>
            <small>{source.detail}</small>
          </div>
        {/each}

        <div class="scenario-node">
          <span>Active scenario</span>
          <strong>{manufacturingScenario.scenario}</strong>
          <p>{manufacturingScenario.detail}</p>
        </div>

        <div class="agent-node">
          <div>
            <span>{manufacturingScenario.policy.label}</span>
            <strong>{manufacturingScenario.policy.action}</strong>
          </div>
          <div class="policy-pass" aria-hidden="true">✓</div>
        </div>
      </div>

      <div class="evidence-strip">
        {#each manufacturingScenario.evidence as item}
          <div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        {/each}
      </div>
    </div>
  </div>

</section>

<style>
  section {
    position: relative;
    isolation: isolate;
    min-height: calc(88vh - 72px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 46px 0 26px;
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
    gap: 48px;
    align-items: center;
    padding: 22px 0 42px;
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
    font-size: clamp(48px, 6.2vw, 78px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 0.98;
    text-wrap: balance;
    margin-bottom: 24px;
  }

  :global(.sub) {
    color: var(--ink-2);
    font-size: 18px;
    line-height: 1.55;
    max-width: 660px;
    margin-bottom: 30px;
  }

  .actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .cta-primary {
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

  .simulator {
    position: relative;
    overflow: hidden;
    min-height: 590px;
    border: 1px solid var(--line-3);
    border-radius: 8px;
    background: #0c0c0c;
    box-shadow:
      0 36px 90px rgba(0, 0, 0, 0.36),
      inset 0 1px 0 rgba(255, 255, 255, 0.18);
  }

  .simulator::after {
    content: "";
    position: absolute;
    inset: 0;
    border-left: 1px solid rgba(255, 107, 26, 0.24);
    pointer-events: none;
  }

  .sim-top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    color: rgba(255, 255, 255, 0.72);
    border-bottom: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .sim-title span,
  .sim-title small {
    display: block;
  }

  .sim-title small {
    color: var(--ink-3);
    font-size: 9px;
    font-weight: 500;
    margin-top: 4px;
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

  .environment-map {
    position: relative;
    z-index: 1;
    height: 430px;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 44px 44px;
  }

  .map-meta {
    position: absolute;
    inset: 18px 20px auto;
    display: flex;
    justify-content: space-between;
    color: var(--ink-3);
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
  }

  .connection {
    position: absolute;
    height: 1px;
    background: rgba(255, 107, 26, 0.55);
    transform-origin: left center;
  }

  .connection-a {
    left: 21%;
    top: 28%;
    width: 31%;
    transform: rotate(11deg);
  }

  .connection-b {
    left: 21%;
    top: 50%;
    width: 29%;
    transform: rotate(-5deg);
  }

  .connection-c {
    left: 21%;
    top: 73%;
    width: 46%;
    background: rgba(108, 182, 255, 0.5);
    transform: rotate(-22deg);
  }

  .connection-d {
    left: 59%;
    top: 48%;
    width: 27%;
    background: rgba(108, 182, 255, 0.5);
    transform: rotate(17deg);
  }

  .source-node {
    position: absolute;
    left: 6%;
    width: 30%;
    padding-left: 12px;
    border-left: 2px solid var(--accent);
  }

  .source-a {
    top: 21%;
  }

  .source-b {
    top: 44%;
  }

  .source-c {
    top: 67%;
    border-color: var(--blue);
  }

  .source-node span,
  .source-node small {
    display: block;
  }

  .source-node span {
    color: var(--ink);
    font-size: 14px;
    font-weight: 700;
  }

  .source-node small {
    color: var(--ink-3);
    font-family: var(--mono);
    font-size: 10px;
    margin-top: 3px;
  }

  .scenario-node {
    position: absolute;
    left: 38%;
    top: 22%;
    width: 42%;
    border: 1px solid rgba(255, 107, 26, 0.55);
    border-radius: 8px;
    background: #101010;
    color: var(--ink);
    padding: 22px;
    box-shadow: 0 24px 56px rgba(0, 0, 0, 0.4);
  }

  .scenario-node span,
  .agent-node span {
    display: block;
    color: var(--accent);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .scenario-node strong {
    display: block;
    font-family: var(--serif);
    font-size: clamp(28px, 3vw, 38px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1;
    margin: 18px 0 10px;
  }

  .scenario-node p {
    color: var(--ink-3);
    font-size: 13px;
  }

  .agent-node {
    position: absolute;
    left: 49%;
    top: 74%;
    width: 43%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid var(--line-3);
    border-radius: 8px;
    background: #131313;
    padding: 16px 18px;
  }

  .agent-node span {
    color: var(--blue);
  }

  .agent-node strong {
    display: block;
    color: var(--ink);
    font-size: 13px;
    margin-top: 5px;
  }

  .policy-pass {
    display: grid;
    flex: 0 0 26px;
    width: 26px;
    height: 26px;
    place-items: center;
    border: 1px solid rgba(255, 107, 26, 0.5);
    border-radius: 50%;
    color: var(--accent);
    font-size: 13px;
  }

  .evidence-strip {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--line);
  }

  .evidence-strip div {
    padding: 18px 20px;
    border-right: 1px solid var(--line);
  }

  .evidence-strip div:last-child {
    border-right: none;
  }

  .evidence-strip span {
    display: block;
    color: var(--ink-3);
    font-family: var(--mono);
    font-size: 10px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .evidence-strip strong {
    color: var(--ink);
    font-size: 15px;
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
      min-height: 650px;
    }

    .environment-map {
      height: 510px;
    }

    .source-node {
      left: 5%;
      width: 34%;
    }

    .scenario-node {
      left: 33%;
      top: 23%;
      width: 60%;
    }

    .agent-node {
      left: 28%;
      top: 66%;
      width: 65%;
    }

    .connection-a,
    .connection-b {
      width: 24%;
    }

    .evidence-strip {
      grid-template-columns: 1fr;
    }

    .evidence-strip div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-right: none;
      border-bottom: 1px solid var(--line);
      padding: 13px 16px;
    }

    .evidence-strip div:last-child {
      border-bottom: none;
    }

    .evidence-strip span {
      margin-bottom: 0;
    }
  }
</style>
