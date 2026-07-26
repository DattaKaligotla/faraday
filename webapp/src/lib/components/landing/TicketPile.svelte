<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const layers = [
    {
      name: "Operational map",
      detail: "How work moves across systems, teams, facilities, machines, approvals, and handoffs.",
    },
    {
      name: "Rules and judgment",
      detail: "Policies, constraints, escalation paths, informal knowledge, and human feedback.",
    },
    {
      name: "Consequence model",
      detail: "What changes when an autonomous worker acts, delays, reroutes, rejects, or asks for help.",
    },
    {
      name: "Readiness gates",
      detail: "Objective evidence that a system can handle the work before it reaches production.",
    },
  ];
</script>

<section>
  <Gutter num="02" label="What Faraday builds">
    <div class="intro">
      <h2 class="section-heading">Training gyms for enterprise operations.</h2>
      <p class="section-copy">
        Faraday turns operational data into RL environments where autonomous workers learn how the enterprise behaves,
        not just how to complete isolated tasks.
      </p>
    </div>

    <div class="layers">
      {#each layers as layer, i}
        <div class="layer">
          <span>{String(i + 1).padStart(2, "0")}</span>
          <h3>{layer.name}</h3>
          <p>{layer.detail}</p>
        </div>
      {/each}
    </div>
  </Gutter>
</section>

<style>
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 0.75fr);
    gap: 56px;
    align-items: end;
    margin-bottom: 34px;
  }

  .layers {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .layer {
    position: relative;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    min-height: 270px;
    padding: 24px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
  }

  .layer::before {
    content: "";
    position: absolute;
    inset: 0 0 auto;
    height: 5px;
    background: var(--accent);
  }

  .layer:nth-child(2)::before {
    background: var(--blue);
  }

  .layer:nth-child(3)::before {
    background: var(--accent-2);
  }

  .layer:nth-child(4)::before {
    background: var(--green);
  }

  .layer span {
    color: var(--accent);
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
  }

  h3 {
    font-family: var(--serif);
    font-size: 32px;
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.08;
    margin: 44px 0 14px;
  }

  .layer p {
    color: var(--ink-3);
    font-size: 15px;
    line-height: 1.6;
  }

  @media (max-width: 1000px) {
    .layers {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .intro,
    .layers {
      grid-template-columns: 1fr;
    }

    .intro {
      gap: 18px;
    }

    .layer {
      min-height: auto;
    }

    h3 {
      margin-top: 28px;
    }
  }
</style>
