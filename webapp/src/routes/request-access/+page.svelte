<script lang="ts">
  import "$lib/components/landing/landing.css";
  import TopNav from "$lib/components/landing/TopNav.svelte";

  let email = $state("");
  let name = $state("");
  let company = $state("");
  let role = $state("");
  let useCase = $state("");
  let website = $state(""); // honeypot

  let busy = $state(false);
  let error = $state("");
  let submitted = $state(false);

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (busy) return;
    error = "";
    busy = true;
    try {
      const res = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, company, role, useCase, website }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        error = body.error || `Submission failed (${res.status}). Try again in a moment.`;
        busy = false;
        return;
      }
      submitted = true;
    } catch {
      error = "Network error. Check your connection and try again.";
      busy = false;
    }
  }
</script>

<svelte:head>
  <title>Request access - Faraday</title>
  <meta
    name="description"
    content="Tell us about the Fortune 500 operations you want to turn into RL environments. We'll be in touch."
  />
</svelte:head>

<div class="faraday-landing">
  <div class="faraday-landing-inner">
    <TopNav />

    <main class="page">
      <div class="rail">
        <div class="num">→</div>
        <div class="label">// request access</div>
      </div>

      <div class="body">
        <h1>Request access.</h1>
        <p class="lede">
          We're onboarding design partners weekly. Tell us about the enterprise operations, agents, or robots you want
          to train safely in RL environments. We'll be in touch within a couple of business days.
        </p>

        {#if submitted}
          <div class="success" role="status">
            <div class="check">✓</div>
            <div>
              <div class="success-title">on the list.</div>
              <div class="success-body">
                We'll reach out from <span class="mono">team@faraday.com</span> shortly.
              </div>
            </div>
          </div>
          <div class="next">
            <a href="/" class="back">← back to home</a>
          </div>
        {:else}
          <form onsubmit={onSubmit} novalidate>
            <div class="row">
              <label for="email">email</label>
              <input
                id="email"
                type="email"
                autocomplete="email"
                required
                maxlength="200"
                bind:value={email}
                disabled={busy}
              />
            </div>

            <div class="grid-2">
              <div class="row">
                <label for="name">name</label>
                <input
                  id="name"
                  type="text"
                  autocomplete="name"
                  required
                  maxlength="100"
                  bind:value={name}
                  disabled={busy}
                />
              </div>
              <div class="row">
                <label for="company">company</label>
                <input
                  id="company"
                  type="text"
                  autocomplete="organization"
                  required
                  maxlength="100"
                  bind:value={company}
                  disabled={busy}
                />
              </div>
            </div>

            <div class="row">
              <label for="role">role</label>
              <input
                id="role"
                type="text"
                placeholder="e.g. Head of Operations, Robotics Lead, CTO"
                maxlength="60"
                bind:value={role}
                disabled={busy}
              />
            </div>

            <div class="row">
              <label for="useCase">what would you use it for?</label>
              <textarea
                id="useCase"
                rows="4"
                maxlength="2000"
                placeholder="A few sentences about your operational systems, environment scope, and the autonomous workflows you want to train."
                bind:value={useCase}
                disabled={busy}
              ></textarea>
            </div>

            <!-- honeypot — must stay empty for real submissions -->
            <input
              class="honeypot"
              type="text"
              name="website"
              tabindex="-1"
              autocomplete="off"
              bind:value={website}
              aria-hidden="true"
            />

            {#if error}
              <div class="error" role="alert">{error}</div>
            {/if}

            <button type="submit" class="submit" disabled={busy}>
              {busy ? "submitting…" : "request access ⏎"}
            </button>

            <p class="finer">
              Already have access? <a href="/login">Sign in →</a>
            </p>
          </form>
        {/if}
      </div>
    </main>
  </div>
</div>

<style>
  .page {
    display: grid;
    grid-template-columns: 180px 1fr;
    gap: 32px;
    padding: 80px 0 120px;
  }
  .rail {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-3);
    letter-spacing: 0;
    text-transform: uppercase;
  }
  .rail .num {
    color: var(--accent);
  }
  .rail .label {
    margin-top: 6px;
  }
  .body {
    max-width: 620px;
  }
  h1 {
    font-family: var(--serif);
    font-size: 56px;
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.05;
    margin-bottom: 16px;
  }
  .lede {
    color: var(--ink-2);
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 36px;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-3);
    letter-spacing: 0;
    text-transform: uppercase;
  }
  input,
  textarea {
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    color: var(--ink);
    border-radius: 4px;
    padding: 10px 12px;
    font-size: 14px;
    font-family: var(--sans);
    transition:
      border-color 120ms,
      background 120ms;
    width: 100%;
  }
  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--accent);
    background: var(--bg-2);
  }
  input:disabled,
  textarea:disabled {
    opacity: 0.6;
  }
  textarea {
    resize: vertical;
    min-height: 96px;
    line-height: 1.55;
  }

  .honeypot {
    position: absolute !important;
    left: -9999px !important;
    width: 1px !important;
    height: 1px !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  .submit {
    align-self: flex-start;
    padding: 11px 18px;
    background: var(--accent);
    color: #0c0c0c;
    font-weight: 600;
    font-size: 14px;
    border-radius: 4px;
    border: none;
    font-family: var(--mono);
    letter-spacing: 0;
    cursor: pointer;
    transition: opacity 120ms;
  }
  .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .error {
    color: var(--red);
    font-family: var(--mono);
    font-size: 12px;
    background: rgba(255, 110, 110, 0.08);
    border: 1px solid rgba(255, 110, 110, 0.3);
    border-radius: 4px;
    padding: 10px 12px;
  }
  .finer {
    color: var(--ink-3);
    font-family: var(--mono);
    font-size: 11px;
    margin-top: 4px;
  }
  .finer a {
    color: var(--accent);
  }
  .finer a:hover {
    text-decoration: underline;
  }

  .success {
    display: flex;
    gap: 18px;
    padding: 24px;
    background: var(--bg-1);
    border: 1px solid var(--line-2);
    border-radius: 8px;
    align-items: flex-start;
  }
  .check {
    width: 32px;
    height: 32px;
    border-radius: 32px;
    background: rgba(108, 211, 108, 0.15);
    color: var(--green);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    flex-shrink: 0;
  }
  .success-title {
    font-family: var(--serif);
    font-size: 22px;
    color: var(--ink);
    margin-bottom: 4px;
  }
  .success-body {
    color: var(--ink-2);
    font-size: 14px;
  }
  .mono {
    font-family: var(--mono);
    color: var(--accent);
  }
  .next {
    margin-top: 20px;
  }
  .back {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--ink-3);
  }
  .back:hover {
    color: var(--ink);
  }

  @media (max-width: 900px) {
    .page {
      grid-template-columns: 1fr;
    }
    h1 {
      font-size: 40px;
    }
    .grid-2 {
      grid-template-columns: 1fr;
    }
  }
</style>
