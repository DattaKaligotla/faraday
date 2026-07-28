<script lang="ts">
  import Logo from "$lib/components/Logo.svelte";
</script>

<footer>
  <div class="closing">
    <p>Faraday</p>
    <h2>Deploy agents only after they have learned the operation.</h2>
  </div>

  <div class="bottom">
    <div class="left">
      <Logo size={16} variant="mark" />
      <span>© 2026 Faraday</span>
    </div>
    <div class="right">
      <a href="/request-access">Request access</a>
      <a href="/login">Sign in</a>
    </div>
  </div>
</footer>

<style>
  footer {
    border-top: 1px solid var(--line);
    padding: 58px 0 38px;
    color: var(--ink);
  }

  .closing {
    max-width: 760px;
    margin-bottom: 52px;
  }

  .closing p {
    color: var(--accent);
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
    margin-bottom: 22px;
  }

  h2 {
    font-family: var(--serif);
    font-size: clamp(34px, 4.4vw, 56px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.05;
    text-wrap: balance;
  }

  .bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    font-family: var(--mono);
    color: var(--ink-3);
    font-size: 11px;
    letter-spacing: 0.04em;
    flex-wrap: wrap;
  }

  .left,
  .right {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  .right a:hover {
    color: var(--ink);
  }

  @media (max-width: 640px) {
    footer {
      padding: 60px 0 40px;
    }

    .closing {
      margin-bottom: 42px;
    }
  }
</style>
