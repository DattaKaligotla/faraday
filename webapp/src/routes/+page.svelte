<script lang="ts">
  import { ArrowRight, ArrowUpRight, Check, List, X } from "phosphor-svelte";

  let menuOpen = $state(false);

  const capabilities = [
    {
      number: "01",
      title: "Precision machining",
      copy: "Prototype and short-run components made from your prints, models, or sample parts.",
      detail: "Milled parts / turned parts / tight-tolerance details",
    },
    {
      number: "02",
      title: "Fixtures and tooling",
      copy: "Purpose-built workholding, gauges, jigs, and production aids for repeatable work.",
      detail: "Weld fixtures / drill guides / inspection tooling",
    },
    {
      number: "03",
      title: "Welded fabrication",
      copy: "Frames, carts, guards, stands, and assemblies built for the reality of the shop floor.",
      detail: "Steel / stainless / aluminum assemblies",
    },
    {
      number: "04",
      title: "Repair and replacement",
      copy: "Practical replacements for damaged, obsolete, or hard-to-source industrial components.",
      detail: "Reverse engineering / repair parts / field support",
    },
  ];

  const process = [
    ["Send the job", "Share a drawing, CAD file, photo, sample part, or a clear description of the problem."],
    ["Review the build", "We clarify materials, tolerances, finish, quantity, inspection needs, and delivery timing."],
    ["Make and verify", "The work is built to the agreed package and checked against the details that matter."],
    ["Deliver ready", "Parts and assemblies arrive labeled, documented, and ready for the next operation."],
  ];
</script>

<svelte:head>
  <title>Faraday Industrial — Precision machining and fabrication</title>
  <meta
    name="description"
    content="Precision machining, tooling, welded fabrication, and industrial repair support from prototype through short-run production."
  />
  <meta property="og:title" content="Faraday Industrial — Built for work that cannot wait" />
  <meta
    property="og:description"
    content="Machined parts, fixtures, welded assemblies, and practical manufacturing support."
  />
  <meta property="og:image" content="/images/faraday-shop-hero.png" />
</svelte:head>

<div class="site-shell">
  <header class="site-header">
    <a class="brand" href="#top" aria-label="Faraday Industrial home">
      <span class="brand-mark" aria-hidden="true"><span></span></span>
      <span>FARADAY <b>INDUSTRIAL</b></span>
    </a>

    <nav class:open={menuOpen} aria-label="Primary navigation">
      <a href="#capabilities" onclick={() => (menuOpen = false)}>Capabilities</a>
      <a href="#process" onclick={() => (menuOpen = false)}>How we work</a>
      <a href="#materials" onclick={() => (menuOpen = false)}>Materials</a>
      <a class="nav-cta" href="#quote" onclick={() => (menuOpen = false)}>
        Request a quote <ArrowUpRight size={15} weight="bold" />
      </a>
    </nav>

    <button
      class="menu-button"
      type="button"
      aria-label={menuOpen ? "Close navigation" : "Open navigation"}
      aria-expanded={menuOpen}
      onclick={() => (menuOpen = !menuOpen)}
    >
      {#if menuOpen}<X size={22} />{:else}<List size={22} />{/if}
    </button>
  </header>

  <main>
    <section id="top" class="hero" aria-labelledby="hero-title">
      <div class="hero-content">
        <p class="eyebrow"><span></span> Precision manufacturing partner</p>
        <h1 id="hero-title">Built for the work<br />that cannot wait.</h1>
        <p class="hero-copy">
          Machined parts, fixtures, welded assemblies, and practical shop support for industrial teams that need to keep
          moving.
        </p>
        <div class="hero-actions">
          <a class="button primary" href="#quote">Start an RFQ <ArrowRight size={17} weight="bold" /></a>
          <a class="text-link" href="#capabilities">Explore capabilities <ArrowRight size={15} /></a>
        </div>
      </div>
      <p class="image-caption">Precision work / practical communication / floor-ready results</p>
    </section>

    <section class="service-strip" aria-label="Manufacturing services">
      <p>From prototype to short run</p>
      <p>Prints, models, or sample parts</p>
      <p>Design-for-manufacturing support</p>
      <p>Direct shop communication</p>
    </section>

    <section id="capabilities" class="section capabilities" aria-labelledby="capabilities-title">
      <div class="section-heading">
        <p class="section-label">What we make</p>
        <div>
          <h2 id="capabilities-title">The parts and tooling that keep production moving.</h2>
          <p>
            We take on the awkward, urgent, and detail-heavy work that sits between an engineering need and a finished
            piece of hardware.
          </p>
        </div>
      </div>

      <div class="capability-grid">
        {#each capabilities as capability}
          <article class="capability">
            <span class="capability-number">{capability.number}</span>
            <h3>{capability.title}</h3>
            <p>{capability.copy}</p>
            <span class="capability-detail">{capability.detail}</span>
          </article>
        {/each}
      </div>
    </section>

    <section class="shop-statement" aria-label="Shop approach">
      <div class="statement-copy">
        <p class="section-label light">The shop standard</p>
        <h2>Useful hardware.<br />Fewer surprises.</h2>
      </div>
      <div class="statement-details">
        <p>
          Good manufacturing starts before a machine turns on. We identify missing dimensions, risky tolerances,
          material questions, and assembly constraints early, then keep the job visible through delivery.
        </p>
        <ul>
          <li><Check size={16} weight="bold" /> Clear scope before production</li>
          <li><Check size={16} weight="bold" /> Practical DFM feedback</li>
          <li><Check size={16} weight="bold" /> Inspection matched to the job</li>
        </ul>
      </div>
    </section>

    <section id="process" class="section process" aria-labelledby="process-title">
      <div class="section-heading compact">
        <p class="section-label">How we work</p>
        <div>
          <h2 id="process-title">A straight line from request to ready-to-use.</h2>
        </div>
      </div>
      <div class="process-list">
        {#each process as step, index}
          <article>
            <span>0{index + 1}</span>
            <h3>{step[0]}</h3>
            <p>{step[1]}</p>
          </article>
        {/each}
      </div>
    </section>

    <section id="materials" class="materials" aria-labelledby="materials-title">
      <div class="materials-inner">
        <div>
          <p class="section-label">Materials and work</p>
          <h2 id="materials-title">Built around the job in front of us.</h2>
          <p class="materials-intro">
            Prototype components, replacement parts, production tooling, equipment modifications, and short-run
            assemblies for demanding industrial environments.
          </p>
        </div>
        <div class="material-list">
          <div>
            <span>01</span>
            <p>Aluminum</p>
          </div>
          <div>
            <span>02</span>
            <p>Carbon steel</p>
          </div>
          <div>
            <span>03</span>
            <p>Stainless steel</p>
          </div>
          <div>
            <span>04</span>
            <p>Engineering plastics</p>
          </div>
          <div>
            <span>05</span>
            <p>Shop-selected specialty materials</p>
          </div>
        </div>
      </div>
    </section>

    <section id="quote" class="quote" aria-labelledby="quote-title">
      <div>
        <p class="section-label light">Start a project</p>
        <h2 id="quote-title">Bring the print.<br />Or bring the problem.</h2>
      </div>
      <div class="quote-action">
        <p>
          Tell us what you need, how many, and when it matters. Include drawings, CAD, photos, or field measurements if
          you have them.
        </p>
        <a
          class="button quote-button"
          href="mailto:hello@faradaystack.com?subject=Manufacturing%20RFQ&body=Project%20summary%3A%0A%0AQuantity%3A%0AMaterial%3A%0ATarget%20date%3A%0A"
        >
          Send an RFQ <ArrowUpRight size={18} weight="bold" />
        </a>
        <span>hello@faradaystack.com</span>
      </div>
    </section>
  </main>

  <footer>
    <a class="brand footer-brand" href="#top">
      <span class="brand-mark" aria-hidden="true"><span></span></span>
      <span>FARADAY <b>INDUSTRIAL</b></span>
    </a>
    <p>Precision machining / fabrication / industrial support</p>
    <p>© {new Date().getFullYear()} Faraday</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #f3f1eb;
    color: #151713;
  }
  :global(html) {
    scroll-padding-top: 76px;
  }

  .site-shell {
    --ink: #151713;
    --paper: #f3f1eb;
    --safety: #d9ff43;
    min-width: 320px;
    overflow: hidden;
    background: var(--paper);
    font-family: Inter, "Helvetica Neue", Arial, sans-serif;
  }

  .site-header {
    position: absolute;
    z-index: 20;
    top: 0;
    left: 0;
    display: flex;
    width: 100%;
    height: 76px;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(255, 255, 255, 0.28);
    color: white;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding-left: clamp(20px, 4vw, 64px);
    font-family: "JetBrains Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0;
  }

  .brand b {
    color: var(--safety);
    font-weight: 700;
  }
  .brand-mark {
    position: relative;
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border: 1px solid currentColor;
  }
  .brand-mark::before,
  .brand-mark::after,
  .brand-mark span::before,
  .brand-mark span::after {
    position: absolute;
    width: 5px;
    height: 5px;
    background: currentColor;
    content: "";
  }
  .brand-mark::before {
    top: 5px;
    left: 5px;
  }
  .brand-mark::after {
    top: 5px;
    right: 5px;
  }
  .brand-mark span::before {
    bottom: 5px;
    left: 5px;
  }
  .brand-mark span::after {
    right: 5px;
    bottom: 5px;
  }

  nav {
    display: flex;
    height: 100%;
    align-items: center;
  }
  nav a {
    display: flex;
    height: 100%;
    align-items: center;
    padding: 0 22px;
    border-left: 1px solid rgba(255, 255, 255, 0.28);
    font-size: 13px;
    font-weight: 650;
  }
  nav a:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  nav .nav-cta {
    gap: 8px;
    background: var(--safety);
    color: var(--ink);
  }
  nav .nav-cta:hover {
    background: #e5ff78;
  }
  .menu-button {
    display: none;
  }

  .hero {
    position: relative;
    display: flex;
    min-height: min(880px, 88svh);
    align-items: flex-end;
    background-color: #1b201f;
    background-image: url("/images/faraday-shop-hero.png");
    background-position: center;
    background-size: cover;
    color: white;
  }
  .hero-content {
    z-index: 1;
    width: min(780px, 64vw);
    padding: 150px clamp(20px, 4vw, 64px) clamp(54px, 8vw, 110px);
  }

  .eyebrow,
  .section-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 30px;
    color: var(--safety);
  }
  .eyebrow span {
    width: 30px;
    height: 2px;
    background: var(--safety);
  }
  h1,
  h2,
  h3,
  p {
    margin: 0;
  }
  h1 {
    max-width: 780px;
    font-size: clamp(48px, 6.3vw, 98px);
    font-weight: 650;
    line-height: 0.95;
    letter-spacing: 0;
  }
  .hero-copy {
    max-width: 620px;
    margin-top: 30px;
    color: rgba(255, 255, 255, 0.82);
    font-size: clamp(17px, 1.35vw, 21px);
    line-height: 1.55;
  }
  .hero-actions {
    display: flex;
    align-items: center;
    gap: 28px;
    margin-top: 38px;
  }

  .button {
    display: inline-flex;
    min-height: 50px;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0 22px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .button.primary {
    background: var(--safety);
    color: var(--ink);
  }
  .button.primary:hover {
    background: #e5ff78;
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 650;
  }
  .text-link:hover {
    color: var(--safety);
  }
  .image-caption {
    position: absolute;
    right: 22px;
    bottom: 22px;
    writing-mode: vertical-rl;
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    text-transform: uppercase;
  }

  .service-strip {
    display: grid;
    min-height: 72px;
    grid-template-columns: repeat(4, 1fr);
    border-bottom: 1px solid #c9c7c0;
    background: var(--safety);
  }
  .service-strip p {
    display: flex;
    align-items: center;
    padding: 18px 24px;
    border-right: 1px solid rgba(21, 23, 19, 0.25);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .section {
    padding: clamp(76px, 9vw, 140px) clamp(20px, 6vw, 96px);
  }
  .section-heading {
    display: grid;
    grid-template-columns: minmax(160px, 0.45fr) minmax(0, 1.55fr);
    gap: 42px;
    margin-bottom: 70px;
  }
  .section-label {
    color: #555a53;
  }
  .section-label.light {
    color: var(--safety);
  }
  .section-heading h2,
  .materials h2,
  .quote h2,
  .shop-statement h2 {
    max-width: 900px;
    font-size: clamp(38px, 4.4vw, 72px);
    font-weight: 590;
    line-height: 1.03;
    letter-spacing: 0;
  }
  .section-heading > div > p {
    max-width: 650px;
    margin-top: 24px;
    color: #555a53;
    font-size: 17px;
    line-height: 1.6;
  }

  .capability-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    border-top: 1px solid #b8b8b1;
  }
  .capability {
    min-height: 300px;
    padding: 34px 34px 30px 0;
    border-bottom: 1px solid #b8b8b1;
  }
  .capability:nth-child(odd) {
    padding-right: 8vw;
    border-right: 1px solid #b8b8b1;
  }
  .capability:nth-child(even) {
    padding-left: 4vw;
  }
  .capability-number {
    color: #777c74;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }
  .capability h3 {
    margin-top: 42px;
    font-size: clamp(24px, 2.1vw, 34px);
    font-weight: 620;
  }
  .capability p {
    max-width: 520px;
    margin-top: 18px;
    color: #555a53;
    font-size: 15px;
    line-height: 1.65;
  }
  .capability-detail {
    display: block;
    margin-top: 34px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  .shop-statement {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 9vw;
    padding: clamp(80px, 10vw, 150px) clamp(20px, 6vw, 96px);
    background: #191c19;
    color: white;
  }
  .shop-statement h2 {
    margin-top: 34px;
  }
  .statement-details {
    align-self: end;
  }
  .statement-details > p {
    color: #bfc3bc;
    font-size: 17px;
    line-height: 1.7;
  }
  .statement-details ul {
    display: grid;
    gap: 14px;
    margin: 34px 0 0;
    padding: 0;
    list-style: none;
  }
  .statement-details li {
    display: flex;
    align-items: center;
    gap: 11px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
  }
  .statement-details li :global(svg) {
    color: var(--safety);
  }

  .section-heading.compact {
    margin-bottom: 50px;
  }
  .process-list {
    border-top: 1px solid #b8b8b1;
  }
  .process-list article {
    display: grid;
    min-height: 125px;
    grid-template-columns: 0.45fr 0.75fr 1.25fr;
    gap: 30px;
    align-items: center;
    border-bottom: 1px solid #b8b8b1;
  }
  .process-list span {
    color: #777c74;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }
  .process-list h3 {
    font-size: clamp(21px, 2vw, 30px);
    font-weight: 620;
  }
  .process-list p {
    max-width: 600px;
    color: #555a53;
    font-size: 15px;
    line-height: 1.6;
  }

  .materials {
    background: #d9d8d2;
  }
  .materials-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 9vw;
    padding: clamp(80px, 10vw, 150px) clamp(20px, 6vw, 96px);
  }
  .materials h2 {
    margin-top: 32px;
  }
  .materials-intro {
    max-width: 600px;
    margin-top: 28px;
    color: #555a53;
    font-size: 16px;
    line-height: 1.65;
  }
  .material-list {
    border-top: 1px solid #a2a49e;
  }
  .material-list div {
    display: grid;
    min-height: 72px;
    grid-template-columns: 70px 1fr;
    align-items: center;
    border-bottom: 1px solid #a2a49e;
  }
  .material-list span {
    color: #6c706a;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }
  .material-list p {
    font-size: 17px;
    font-weight: 620;
  }

  .quote {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 8vw;
    padding: clamp(80px, 10vw, 150px) clamp(20px, 6vw, 96px);
    background: #b72519;
    color: white;
  }
  .quote h2 {
    margin-top: 32px;
  }
  .quote-action {
    align-self: end;
  }
  .quote-action > p {
    max-width: 570px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 16px;
    line-height: 1.65;
  }
  .quote-button {
    margin-top: 30px;
    background: white;
    color: #151713;
  }
  .quote-button:hover {
    background: var(--safety);
  }
  .quote-action > span {
    display: block;
    margin-top: 15px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
  }

  footer {
    display: grid;
    min-height: 130px;
    grid-template-columns: 1fr 1fr auto;
    align-items: center;
    gap: 30px;
    padding: 30px clamp(20px, 4vw, 64px);
    background: #111310;
    color: white;
  }
  .footer-brand {
    padding-left: 0;
  }
  footer p {
    color: #91968f;
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    text-transform: uppercase;
  }

  @media (max-width: 880px) {
    .site-header {
      height: 68px;
    }
    .menu-button {
      display: grid;
      width: 68px;
      height: 68px;
      place-items: center;
      border: 0;
      border-left: 1px solid rgba(255, 255, 255, 0.28);
      background: transparent;
      color: white;
    }
    nav {
      position: absolute;
      top: 68px;
      left: 0;
      display: none;
      width: 100%;
      height: auto;
      flex-direction: column;
      align-items: stretch;
      background: #171a17;
    }
    nav.open {
      display: flex;
    }
    nav a {
      min-height: 58px;
      border-bottom: 1px solid #353935;
      border-left: 0;
    }
    .hero {
      min-height: 760px;
      background-position: 61% center;
    }
    .hero-content {
      width: 100%;
      padding-top: 130px;
    }
    .service-strip {
      grid-template-columns: repeat(2, 1fr);
    }
    .section-heading,
    .materials-inner,
    .quote,
    .shop-statement {
      grid-template-columns: 1fr;
    }
    .section-heading {
      gap: 26px;
    }
    .capability-grid {
      grid-template-columns: 1fr;
    }
    .capability:nth-child(odd) {
      padding-right: 0;
      border-right: 0;
    }
    .capability:nth-child(even) {
      padding-left: 0;
    }
    .capability {
      min-height: 260px;
    }
    .process-list article {
      grid-template-columns: 50px 0.8fr 1.2fr;
    }
    footer {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 580px) {
    .brand {
      padding-left: 18px;
      font-size: 11px;
    }
    .brand-mark {
      width: 26px;
      height: 26px;
    }
    .hero {
      min-height: 720px;
      background-position: 59% center;
    }
    .hero-content {
      padding-right: 20px;
      padding-bottom: 68px;
    }
    h1 {
      font-size: clamp(42px, 13vw, 64px);
    }
    .hero-copy {
      max-width: 92%;
      font-size: 16px;
    }
    .hero-actions {
      align-items: flex-start;
      flex-direction: column;
      gap: 20px;
    }
    .image-caption {
      display: none;
    }
    .service-strip {
      grid-template-columns: 1fr;
    }
    .service-strip p {
      min-height: 52px;
      border-right: 0;
      border-bottom: 1px solid rgba(21, 23, 19, 0.2);
    }
    .section-heading h2,
    .materials h2,
    .quote h2,
    .shop-statement h2 {
      font-size: 38px;
    }
    .process-list article {
      grid-template-columns: 36px 1fr;
      gap: 14px;
      padding: 24px 0;
    }
    .process-list p {
      grid-column: 2;
    }
    .materials-inner {
      gap: 48px;
    }
    .quote {
      gap: 48px;
    }
  }
</style>
