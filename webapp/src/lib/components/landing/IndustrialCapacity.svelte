<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const outcomes = [
    {
      label: "Build more",
      detail: "Give autonomous systems a faithful model of the plants, equipment, and constraints behind production.",
    },
    {
      label: "Move reliably",
      detail:
        "Train against supplier failures, capacity shifts, urgent orders, and the handoffs between organizations.",
    },
    {
      label: "Operate resiliently",
      detail: "Prove recovery behavior across critical infrastructure before autonomy receives real authority.",
    },
  ];
</script>

<section id="industrial-capacity">
  <Gutter num="02" label="Industrial capacity">
    <div class="thesis">
      <div>
        <span class="signal">Industrial capacity is becoming intelligent</span>
        <h2 class="section-heading">
          The next industrial edge will be built by people and autonomous systems working together.
        </h2>
      </div>

      <div class="copy">
        <p>
          Factories, supply chains, energy systems, and defense programs cannot train autonomy through trial and error
          in production.
        </p>
        <p>
          Faraday Cage turns their operating reality into environments where AI agents can learn the work,
          rehearse disruptions, and prove readiness before deployment.
        </p>
      </div>
    </div>

    <div class="outcomes">
      {#each outcomes as outcome, index}
        <div class="outcome">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <h3>{outcome.label}</h3>
          <p>{outcome.detail}</p>
        </div>
      {/each}
    </div>
  </Gutter>
</section>

<style>
  .thesis {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
    gap: 72px;
    align-items: end;
  }

  .signal {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 22px;
    color: var(--blue);
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .signal::before {
    content: "";
    width: 28px;
    height: 1px;
    background: var(--blue);
  }

  .copy {
    display: grid;
    gap: 18px;
    padding-bottom: 3px;
    color: var(--ink-2);
    font-size: 16px;
    line-height: 1.65;
  }

  .outcomes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 54px;
    border-top: 1px solid var(--line-2);
    border-bottom: 1px solid var(--line-2);
  }

  .outcome {
    min-height: 196px;
    padding: 22px 28px 26px 0;
    border-right: 1px solid var(--line-2);
  }

  .outcome + .outcome {
    padding-left: 28px;
  }

  .outcome:last-child {
    border-right: none;
  }

  .outcome > span {
    color: var(--ink-4);
    font-family: var(--mono);
    font-size: 10px;
  }

  h3 {
    margin-top: 34px;
    color: var(--ink);
    font-family: var(--serif);
    font-size: 30px;
    font-weight: 500;
  }

  .outcome p {
    margin-top: 13px;
    color: var(--ink-3);
    font-size: 13px;
    line-height: 1.6;
  }

  @media (max-width: 860px) {
    .thesis {
      grid-template-columns: 1fr;
      gap: 28px;
    }
  }

  @media (max-width: 680px) {
    .outcomes {
      grid-template-columns: 1fr;
    }

    .outcome,
    .outcome + .outcome {
      min-height: auto;
      padding: 22px 0 24px;
      border-right: none;
      border-bottom: 1px solid var(--line-2);
    }

    .outcome:last-child {
      border-bottom: none;
    }

    h3 {
      margin-top: 20px;
    }
  }
</style>
