<script lang="ts">
  import Logo from "$lib/components/Logo.svelte";
  import Mod from "./Mod.svelte";

  let menuOpen = $state(false);

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }
</script>

<nav>
  <a href="/" aria-label="Faraday Cage homepage" class="brand-link">
    <Mod id="brand" as="span" class="brand">
      <Logo size={22} variant="lockup" />
    </Mod>
  </a>

  <div class="nav-links">
    <a href="#model">What we build</a>
    <a href="#industries">Industries</a>
    <a href="/login">Sign in</a>
    <a href="/request-access" class="cta">Request access</a>
    <button
      type="button"
      class="menu-toggle"
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      aria-expanded={menuOpen}
      onclick={toggleMenu}
    >
      <span class="bar" class:open={menuOpen}></span>
      <span class="bar mid" class:open={menuOpen}></span>
      <span class="bar" class:open={menuOpen}></span>
    </button>
  </div>
</nav>

{#if menuOpen}
  <div class="mobile-menu">
    <a href="#model" onclick={closeMenu}>What we build</a>
    <a href="#industries" onclick={closeMenu}>Industries</a>
    <a href="/login" onclick={closeMenu}>Sign in</a>
  </div>
{/if}

<style>
  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 0;
    position: sticky;
    top: 0;
    z-index: 30;
    margin: 0 calc(50% - 50vw);
    padding-left: max(28px, calc(50vw - 610px));
    padding-right: max(28px, calc(50vw - 610px));
    background: color-mix(in oklab, var(--bg) 88%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px dashed var(--line-2);
  }

  .brand-link,
  :global(.brand) {
    display: inline-flex;
    align-items: center;
    color: var(--ink);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 22px;
    color: var(--ink-2);
    font-family: var(--mono);
    font-size: 12px;
  }

  .nav-links a {
    transition: color 140ms ease;
  }

  .nav-links a:hover {
    color: var(--ink);
  }

  .cta {
    color: #0c0c0c;
    background: var(--accent);
    border-radius: 3px;
    padding: 7px 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    box-shadow: none;
  }

  .cta:hover {
    color: #0c0c0c;
    background: var(--ink);
  }

  .menu-toggle {
    display: none;
    width: 34px;
    height: 34px;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    border: 1px solid var(--line-3);
    border-radius: 4px;
    padding: 0;
    background: transparent;
  }

  .bar {
    width: 14px;
    height: 1.5px;
    background: var(--ink-2);
    border-radius: 2px;
    transition:
      transform 160ms ease,
      opacity 160ms ease;
  }

  .bar.open:first-child {
    transform: translateY(6.5px) rotate(45deg);
  }

  .bar.mid.open {
    opacity: 0;
  }

  .bar.open:last-child {
    transform: translateY(-6.5px) rotate(-45deg);
  }

  .mobile-menu {
    display: none;
    flex-direction: column;
    position: sticky;
    top: 78px;
    z-index: 29;
    background: color-mix(in oklab, var(--bg) 92%, transparent);
    border-bottom: 1px dashed var(--line-2);
    padding: 8px 0 12px;
    gap: 2px;
    font-family: var(--mono);
  }

  .mobile-menu a {
    color: var(--ink-2);
    padding: 10px 4px;
    border-bottom: 1px solid var(--line);
  }

  .mobile-menu a:hover {
    color: var(--accent);
  }

  @media (max-width: 820px) {
    nav {
      padding: 14px 0;
    }

    .nav-links a:not(.cta) {
      display: none;
    }

    .menu-toggle {
      display: inline-flex;
    }

    .mobile-menu {
      display: flex;
    }
  }

  @media (max-width: 380px) {
    .cta {
      display: none;
    }
  }
</style>
