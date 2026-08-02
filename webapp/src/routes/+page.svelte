<script lang="ts">
  import "$lib/components/landing/landing.css";
  import TopNav from "$lib/components/landing/TopNav.svelte";
  import Hero from "$lib/components/landing/Hero.svelte";
  import Industries from "$lib/components/landing/Industries.svelte";
  import Footer from "$lib/components/landing/Footer.svelte";
</script>

<svelte:head>
  <title>Faradaystack - Simulation before production</title>
  <meta
    name="description"
    content="Faradaystack builds private simulation environments where AI systems learn enterprise operations before deployment."
  />
</svelte:head>

<div class="faraday-landing">
  <div class="faraday-landing-inner">
    <TopNav />
    <Hero />
    <Industries />
    <Footer />
  </div>
</div>
