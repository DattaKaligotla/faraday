<svelte:head>
  <title>faradaycage.com</title>
  <meta name="description" content="faradaycage.com" />
</svelte:head>

<main class="holding-page">
  <h1>faradaycage.com</h1>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #ffffff;
  }

  .holding-page {
    min-height: 100vh;
    background: #ffffff;
    color: #111111;
    display: grid;
    place-items: center;
    font-family:
      Inter,
      "SF Pro Text",
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
  }

  h1 {
    margin: 0;
    font-size: clamp(32px, 5vw, 56px);
    font-weight: 700;
    letter-spacing: 0;
  }
</style>
