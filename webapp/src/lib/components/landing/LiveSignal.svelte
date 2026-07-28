<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const sources = [
    {
      name: "Systems of record",
      examples: "ERP, WMS, MES, CRM, ticketing, databases",
    },
    {
      name: "Operating knowledge",
      examples: "SOPs, policies, messages, call notes, exceptions",
    },
    {
      name: "Human feedback",
      examples: "Planner reviews, operator corrections, manager approvals",
    },
    {
      name: "Physical world",
      examples: "Machine state, downtime, capacity, location",
    },
  ];
</script>

<section id="sources">
  <Gutter num="04" label="What it learns from">
    <div class="grid">
      <div>
        <h2 class="section-heading">The environment learns from the places work already happens.</h2>
        <p class="section-copy">
          Faraday combines formal system state with the informal knowledge operators use every day. As workflows,
          policies, and conditions change, the environment changes with them.
        </p>
      </div>

      <div class="source-list">
        {#each sources as source}
          <div class="source">
            <h3>{source.name}</h3>
            <p>{source.examples}</p>
          </div>
        {/each}
      </div>
    </div>
  </Gutter>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
    gap: 64px;
    align-items: start;
  }

  .section-copy {
    margin-top: 22px;
    max-width: 600px;
  }

  .source-list {
    display: grid;
    gap: 12px;
  }

  .source {
    position: relative;
    display: grid;
    grid-template-columns: 0.5fr 1fr;
    gap: 24px;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
  }

  .source::before {
    content: "";
    position: absolute;
    inset: 20px auto 20px 0;
    width: 4px;
    border-radius: 999px;
    background: var(--accent);
  }

  .source:nth-child(2)::before {
    background: var(--blue);
  }

  .source:nth-child(3)::before {
    background: var(--accent-2);
  }

  .source:nth-child(4)::before {
    background: var(--green);
  }

  h3 {
    color: var(--ink);
    font-size: 17px;
    line-height: 1.25;
  }

  .source p {
    color: var(--ink-3);
    font-size: 15px;
    line-height: 1.55;
  }

  @media (max-width: 860px) {
    .grid,
    .source {
      grid-template-columns: 1fr;
    }

    .grid {
      gap: 28px;
    }

    .source {
      gap: 8px;
    }
  }
</style>
