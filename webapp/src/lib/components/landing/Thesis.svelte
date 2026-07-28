<section id="thesis">
  <div class="container">
    <div class="section-label">Thesis</div>
    <h2 class="section-title">Autonomous workers need RL environments before they can work in the enterprise.</h2>

    <div class="thesis-body">
      <p class="lede">
        A large enterprise is not a clean task list. It is people, systems, machines, rules, exceptions, and judgment
        calls interacting every day.
      </p>

      <p>
        AI agents can now take action, but action alone is not useful. They need to understand what the work
        affects, what constraints matter, when tradeoffs are acceptable, and when humans should stay in control.
      </p>

      <p>
        Production is the wrong classroom. Real customers, employees, inventory, equipment, and service levels should
        not be the first place an autonomous worker discovers how the business works.
      </p>

      <p>
        Faraday builds RL environments from the systems and knowledge that already run the business. Inside those
        environments, autonomous workers practice workflows, face disruptions, learn handoffs, and prove readiness
        before they are deployed.
      </p>

      <p class="kicker">
        We believe every Fortune 500 will eventually have autonomous workers. Faraday is where they train before
        production.
      </p>
    </div>
  </div>
</section>

<style>
  section {
    padding: 100px 0;
    border-top: 1px solid var(--border);
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .section-label {
    color: var(--accent);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  .section-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(34px, 5vw, 64px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.04;
    max-width: 920px;
    margin-bottom: 54px;
  }

  .thesis-body {
    max-width: 740px;
    font-size: 18px;
    line-height: 1.75;
    color: var(--text-muted);
  }

  .thesis-body p {
    margin-bottom: 22px;
  }

  .lede {
    font-size: 20px;
    color: var(--text);
  }

  .kicker {
    margin-top: 36px;
    padding-top: 26px;
    border-top: 1px solid var(--border);
    color: var(--text);
    font-weight: 600;
  }
</style>
