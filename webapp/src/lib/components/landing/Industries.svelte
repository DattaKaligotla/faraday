<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const industries = [
    {
      name: "Manufacturing",
      systems: "ERP · MES · robotics · quality",
      scenarios: "Line outages, quality drift, re-planning, and human safety gates.",
      accent: "orange",
    },
    {
      name: "Logistics & supply chain",
      systems: "WMS · TMS · order systems · telematics",
      scenarios: "Supplier delays, capacity shifts, fulfillment exceptions, and recovery.",
      accent: "blue",
    },
    {
      name: "Energy & utilities",
      systems: "SCADA · asset systems · work orders",
      scenarios: "Equipment failures, field dispatch, restoration, and operating limits.",
      accent: "green",
    },
    {
      name: "Aerospace & defense",
      systems: "Mission systems · maintenance · logistics",
      scenarios: "Readiness, maintenance recovery, constrained logistics, and human authorization.",
      accent: "yellow",
    },
  ] as const;
</script>

<section id="industries">
  <Gutter num="02" label="Industries">
    <div class="intro">
      <h2 class="section-heading">Manufacturing, logistics, energy, and defense.</h2>
      <p class="section-copy">Physical operations with many systems of record, strict constraints, and clear safety gates.</p>
    </div>

    <div class="industry-grid">
      {#each industries as industry, index}
        <article class={industry.accent}>
          <div class="industry-index">{String(index + 1).padStart(2, "0")}</div>
          <h3>{industry.name}</h3>
          <div class="systems">{industry.systems}</div>
          <p>{industry.scenarios}</p>
        </article>
      {/each}
    </div>
  </Gutter>
</section>

<style>
  .intro {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.55fr);
    align-items: end;
    gap: 60px;
    margin-bottom: 48px;
  }

  .section-copy {
    padding-bottom: 4px;
  }

  .industry-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--line-2);
    border-bottom: 1px solid var(--line-2);
  }

  article {
    position: relative;
    min-height: 310px;
    display: flex;
    flex-direction: column;
    padding: 22px 24px 26px;
    border-right: 1px solid var(--line-2);
    background: rgba(19, 19, 19, 0.72);
  }

  article:last-child {
    border-right: none;
  }

  article::before {
    content: "";
    position: absolute;
    top: -1px;
    left: 24px;
    width: 38px;
    height: 2px;
    background: var(--accent);
  }

  article.blue::before {
    background: var(--blue);
  }

  article.green::before {
    background: var(--green);
  }

  article.yellow::before {
    background: var(--yellow);
  }

  .industry-index,
  .systems {
    color: var(--ink-4);
    font-family: var(--mono);
    font-size: 10px;
  }

  h3 {
    min-height: 78px;
    margin-top: 42px;
    font-family: var(--serif);
    font-size: 29px;
    font-weight: 500;
    line-height: 1.05;
  }

  .systems {
    min-height: 50px;
    margin-top: auto;
    padding-top: 17px;
    border-top: 1px solid var(--line);
    color: var(--ink-3);
    line-height: 1.55;
    text-transform: uppercase;
  }

  article p {
    margin-top: 16px;
    color: var(--ink-2);
    font-size: 13px;
    line-height: 1.55;
  }

  @media (max-width: 980px) {
    .industry-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    article:nth-child(2) {
      border-right: none;
    }

    article:nth-child(-n + 2) {
      border-bottom: 1px solid var(--line-2);
    }
  }

  @media (max-width: 720px) {
    .intro {
      grid-template-columns: 1fr;
      gap: 22px;
      margin-bottom: 34px;
    }
  }

  @media (max-width: 560px) {
    .industry-grid {
      grid-template-columns: 1fr;
    }

    article,
    article:nth-child(2) {
      min-height: 240px;
      border-right: none;
      border-bottom: 1px solid var(--line-2);
    }

    article:last-child {
      border-bottom: none;
    }

    h3 {
      min-height: 0;
      margin-bottom: 48px;
    }
  }
</style>
