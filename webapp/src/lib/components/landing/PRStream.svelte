<script lang="ts">
  import Gutter from "./Gutter.svelte";

  const scenarios = [
    { name: "Supplier delay", result: "Ready", score: "98%", detail: "0 violations · −12% cost" },
    { name: "Equipment outage", result: "Needs review", score: "91%", detail: "1 violation · +3% cost" },
    { name: "Labor shortage", result: "Ready", score: "95%", detail: "0 violations · −7% cost" },
    { name: "Priority escalation", result: "Improve", score: "87%", detail: "2 violations · +1% cost" },
  ];
</script>

<section id="readiness">
  <Gutter num="06" label="Before deployment">
    <div class="grid">
      <div>
        <h2 class="section-heading">Deployment becomes an evidence decision.</h2>
        <p class="section-copy">
          Faraday shows where a system is reliable, where it needs supervision, and where it should not act yet. The
          question changes from “can it complete the task?” to “can it operate safely under real constraints?”
        </p>
      </div>

      <div class="readiness-card">
        <div class="card-head">
          <span>Autonomous inventory planner</span>
          <strong>Deployment review</strong>
        </div>

        <div class="scenarios">
          {#each scenarios as scenario}
            <div class="scenario">
              <div>
                <span>{scenario.name}</span>
                <strong>{scenario.result}</strong>
                <small>{scenario.detail}</small>
              </div>
              <b>{scenario.score}</b>
            </div>
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
    gap: 64px;
    align-items: start;
  }

  .section-copy {
    margin-top: 22px;
    max-width: 590px;
  }

  .readiness-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.28);
    overflow: hidden;
  }

  .card-head {
    padding: 28px;
    background: #101010;
    color: #fff;
    border-bottom: 1px solid var(--line);
  }

  .card-head span {
    display: block;
    color: rgba(255, 255, 255, 0.64);
    font-size: 14px;
    margin-bottom: 8px;
  }

  .card-head strong {
    display: block;
    font-family: var(--serif);
    font-size: 40px;
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.05;
  }

  .scenario {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    padding: 19px 24px;
    border-bottom: 1px solid var(--line);
  }

  .scenario:last-child {
    border-bottom: none;
  }

  .scenario span {
    display: block;
    color: var(--ink-3);
    font-size: 14px;
    margin-bottom: 4px;
  }

  .scenario strong {
    display: block;
    color: var(--ink);
    font-size: 17px;
  }

  .scenario small {
    display: block;
    color: var(--ink-3);
    font-family: var(--mono);
    font-size: 10px;
    margin-top: 5px;
  }

  .scenario b {
    color: var(--accent);
    font-size: 24px;
    font-weight: 650;
  }

  @media (max-width: 860px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }
  }
</style>
