<script lang="ts">
  import { goto } from "$app/navigation";
  import { signIn } from "$lib/auth";
  import Logo from "$lib/components/Logo.svelte";

  let email = $state("");
  let password = $state("");
  let msg = $state("");
  let msgClass = $state("");
  let busy = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    msg = "";
    msgClass = "";
    busy = true;
    try {
      await signIn(email, password);
      msg = "> success — redirecting…";
      msgClass = "ok";
      setTimeout(() => goto("/dashboard", { replaceState: true }), 400);
    } catch (err) {
      msg = "> " + (err instanceof Error ? err.message : "Something went wrong.");
      msgClass = "error";
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Sign in - Faraday Cage</title>
</svelte:head>

<header class="top">
  <a href="/" class="logo">
    <Logo variant="lockup" />
  </a>
</header>

<main class="main">
  <div class="card">
    <h1>Welcome back</h1>
    <p class="sub">Sign in to your Faraday Cage account.</p>

    <form onsubmit={submit} novalidate>
      <div>
        <label for="email">Email</label>
        <input id="email" type="email" autocomplete="email" required bind:value={email} />
      </div>
      <div>
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          required
          minlength={8}
          bind:value={password}
        />
      </div>
      <button class="submit" type="submit" disabled={busy}>Sign in</button>
      <div class="message {msgClass}" role="status" aria-live="polite">{msg}</div>
    </form>

    <div class="footer">
      <a href="/">← Back to home</a>
    </div>
  </div>
</main>

<style>
  :global(body) {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .top {
    padding: 24px 28px;
  }
  .logo {
    display: inline-flex;
    align-items: center;
  }
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px 80px;
    position: relative;
  }
  .main::before {
    content: "";
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 400px;
    background: radial-gradient(ellipse at center, rgba(249, 115, 22, 0.1) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 36px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    position: relative;
    z-index: 1;
  }
  .card h1 {
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 0;
    margin-bottom: 6px;
  }
  .card .sub {
    font-size: 14px;
    color: var(--text-muted);
    margin-bottom: 28px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  label {
    display: block;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
  }
  input {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    padding: 11px 12px;
    font-family: var(--sans);
    font-size: 14px;
    color: var(--text);
    outline: none;
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.15);
  }
  button.submit {
    margin-top: 4px;
    background: var(--accent);
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 11px 16px;
    font-family: var(--sans);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  button.submit:hover {
    background: #ea6a0a;
  }
  button.submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .message {
    min-height: 18px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .message.error {
    color: var(--red);
  }
  .message.ok {
    color: var(--accent-dim);
  }
  .footer {
    margin-top: 24px;
    text-align: center;
    font-size: 13px;
    color: var(--text-subtle);
  }
  .footer a {
    color: var(--text-muted);
  }
  .footer a:hover {
    color: var(--accent);
  }
</style>
