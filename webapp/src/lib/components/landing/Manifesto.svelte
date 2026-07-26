<script lang="ts">
  import Gutter from "./Gutter.svelte";
  import Mod from "./Mod.svelte";
</script>

<section id="model">
  <Gutter num="01" label="The missing environment">
    <div class="grid">
      <div>
        <h2 class="section-heading">
          The hard part is not making an agent act. <Mod id="thesis-italic" as="span" class="accent"
            >It is teaching it the business.</Mod
          >
        </h2>
      </div>

      <div class="copy">
        <Mod id="manifesto-1" as="p">
          An enterprise operation is not just software. It is a web of goals, roles, constraints, habits, exceptions,
          equipment, policies, and judgment calls.
        </Mod>
        <Mod id="manifesto-2" as="p">
          Autonomous workers fail when they only see a task. They need environments that teach them what the task
          affects, who depends on it, what rules cannot be broken, and when a person should be brought in.
        </Mod>
        <Mod id="manifesto-3" as="p">
          Production is the wrong place for that learning to happen. Faraday gives AI agents and robots a faithful,
          executable environment where they can practice, fail, improve, and prove readiness before deployment.
        </Mod>
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

  :global(.accent) {
    color: var(--accent);
    font-style: italic;
  }

  .copy {
    display: grid;
    gap: 22px;
    color: var(--ink-2);
    font-size: 18px;
    line-height: 1.7;
  }

  @media (max-width: 860px) {
    .grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }

    .copy {
      font-size: 16px;
    }
  }
</style>
