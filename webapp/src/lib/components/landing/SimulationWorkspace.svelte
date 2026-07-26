<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const actions = [
    {
      name: "Train",
      detail: "Let autonomous workers learn inside an RL environment before they receive production authority.",
    },
    {
      name: "Stress test",
      detail: "Run disruptions, shortages, equipment failures, urgent orders, and messy handoffs.",
    },
    {
      name: "Compare",
      detail: "Measure different agents and robots against the same business scenarios and constraints.",
    },
    {
      name: "Approve",
      detail: "Move only the systems that meet operational thresholds into deployment.",
    },
  ];
</script>

<section id="workspace">
  <Gutter num="04" label="What teams do">
    <div class="intro">
      <h2 class="section-heading">Practice the work before changing the work.</h2>
      <p class="section-copy">
        Faraday gives operations, automation, and AI teams one shared place to train and evaluate autonomous workers
        before they affect customers, employees, inventory, equipment, or service levels.
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
