<script lang="ts">
  import "$lib/components/landing/landing.css";
  import TopNav from "$lib/components/landing/TopNav.svelte";
  import Hero from "$lib/components/landing/Hero.svelte";
  import Manifesto from "$lib/components/landing/Manifesto.svelte";
  import Industries from "$lib/components/landing/Industries.svelte";
  import Footer from "$lib/components/landing/Footer.svelte";
</script>

<svelte:head>
  <title>Faraday - Simulation for autonomous operations</title>
  <meta
    name="description"
    content="Faraday builds private simulation environments where AI agents and robots learn enterprise operations before deployment."
  />
</svelte:head>

<div class="faraday-landing">
  <div class="faraday-landing-inner">
    <TopNav />
    <Hero />
    <Manifesto />
    <Industries />
    <Footer />
  </div>
</div>
