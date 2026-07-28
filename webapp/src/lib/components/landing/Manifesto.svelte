<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const points = [
    {
      label: "Connect",
      text: "Read from ERP, MES, WMS, SCADA, ticketing, quality, and maintenance systems without giving agents production authority.",
    },
    {
      label: "Simulate",
      text: "Recreate the workflows, constraints, exceptions, approval paths, and failure modes that define how the operation runs.",
    },
    {
      label: "Evaluate",
      text: "Run agents against realistic scenarios before deciding what can be deployed, escalated, or blocked.",
    },
  ];
</script>

<section id="model">
  <Gutter num="01" label="What we build">
    <div class="grid">
      <div>
        <h2 class="section-heading">Enterprise simulations for AI agents.</h2>
      </div>

      <div class="copy">
        <p>
          Faraday turns an enterprise operation into a secure simulation environment. Agents can practice decisions
          there before they are trusted with real work.
        </p>

        <div class="points">
          {#each points as point}
            <article>
              <h3>{point.label}</h3>
              <p>{point.text}</p>
            </article>
          {/each}
        </div>
      </div>
    </div>
  </Gutter>
</section>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
    gap: 72px;
  }

  .copy {
    display: grid;
    gap: 26px;
    color: var(--ink-2);
    font-size: 17px;
    line-height: 1.62;
  }

  .points {
    display: grid;
    gap: 1px;
    border: 1px solid var(--line-2);
    background: var(--line);
  }

  article {
    display: grid;
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 28px;
    padding: 20px;
    background: var(--bg);
  }

  h3 {
    color: var(--accent);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  article p {
    color: var(--ink-2);
    font-size: 14px;
    line-height: 1.55;
  }

  @media (max-width: 860px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .copy {
      font-size: 16px;
    }

    article {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
</style>
