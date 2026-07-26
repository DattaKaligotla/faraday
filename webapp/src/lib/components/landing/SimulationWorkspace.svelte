<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const actions = [
    {
      name: "Learn",
      detail: "Let agents discover the operation safely before they receive production authority.",
    },
    {
      name: "Stress test",
      detail: "Run disruptions, shortages, equipment failures, urgent orders, and messy handoffs.",
    },
    {
      name: "Measure",
      detail: "Score every decision against service level, cost, safety, latency, and policy.",
    },
    {
      name: "Gate",
      detail: "Grant authority only when a system meets operational thresholds across known failure modes.",
    },
  ];
</script>

<section id="workspace">
  <Gutter num="05" label="What teams do">
    <div class="intro">
      <h2 class="section-heading">Let autonomy encounter the bad day before the real one happens.</h2>
      <p class="section-copy">
        Start with a real workflow. Introduce supplier delays, equipment failures, urgent orders, incomplete data, and
        messy human handoffs. See not only whether the system finishes—but whether it makes the right tradeoffs.
      </p>
    </div>

    <div class="workbench">
      {#each actions as action}
        <div class="action">
          <h3>{action.name}</h3>
          <p>{action.detail}</p>
        </div>
      {/each}
    </div>
  </Gutter>
</section>

<style>
  .intro {
    max-width: 820px;
    margin-bottom: 34px;
  }

  .section-copy {
    margin-top: 18px;
  }

  .workbench {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .action {
    position: relative;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 28px;
    min-height: 260px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
  }

  .action::after {
    content: "";
    position: absolute;
    right: 22px;
    bottom: 22px;
    width: 54px;
    height: 1px;
    background: var(--line-2);
  }

  .action:nth-child(2) {
    background: #121820;
  }

  .action:nth-child(3) {
    background: #1b130f;
  }

  .action:nth-child(4) {
    background: #111a14;
  }

  h3 {
    font-family: var(--serif);
    font-size: 36px;
    font-weight: 500;
    letter-spacing: 0;
    margin-bottom: 92px;
  }

  .action p {
    position: relative;
    z-index: 1;
    color: var(--ink-3);
    font-size: 15px;
    line-height: 1.6;
  }

  @media (max-width: 980px) {
    .workbench {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 620px) {
    .workbench {
      grid-template-columns: 1fr;
    }

    .action {
      min-height: auto;
    }

    h3 {
      margin-bottom: 42px;
    }
  }
</style>
