<script lang="ts">
  import Logo from "../Logo.svelte";
</script>

<nav>
  <div class="nav-inner container">
    <a href="/" class="logo" aria-label="Faraday Cage home">
      <Logo variant="lockup" />
    </a>
    <div class="nav-links">
      <a href="/#model">Model</a>
      <a href="/#sources">Signals</a>
      <a href="/#readiness">Readiness</a>
      <a href="/request-access" class="nav-cta">Request access</a>
    </div>
  </div>
</nav>
font-family: var(--mono);

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in oklab, var(--bg) 88%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 68px;
  }

  .logo {
    display: flex;
    align-items: center;
  }

  .nav-links {
    display: flex;
    gap: 28px;
    align-items: center;
  }

  .nav-links a {
    color: var(--text-muted);
    font-size: 14px;
    transition: color 0.15s ease;
  }

  .nav-links a:hover {
    color: var(--text);
  }

  .nav-cta {
    color: #0c0c0c !important;
    background: var(--accent);
    border-radius: 3px;
    padding: 9px 15px;
    font-weight: 650;
  }

  @media (max-width: 640px) {
    .nav-links a:not(.nav-cta) {
      display: none;
    }
  }
</style>
