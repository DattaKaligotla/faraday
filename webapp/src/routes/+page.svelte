<script lang="ts">
  import "$lib/components/landing/landing.css";
  import TopNav from "$lib/components/landing/TopNav.svelte";
  import Hero from "$lib/components/landing/Hero.svelte";
  import Manifesto from "$lib/components/landing/Manifesto.svelte";
  import IndustrialCapacity from "$lib/components/landing/IndustrialCapacity.svelte";
  import TicketPile from "$lib/components/landing/TicketPile.svelte";
  import LiveSignal from "$lib/components/landing/LiveSignal.svelte";
  import SimulationWorkspace from "$lib/components/landing/SimulationWorkspace.svelte";
  import PRStream from "$lib/components/landing/PRStream.svelte";
  import Industries from "$lib/components/landing/Industries.svelte";
  import Footer from "$lib/components/landing/Footer.svelte";
</script>

<svelte:head>
  <title>Faraday — RL Environments for Critical Industry</title>
  <meta
    name="description"
    content="Faraday builds secure RL environments where AI agents and robots learn the work of manufacturers, logistics networks, and critical infrastructure before touching production."
  />
</svelte:head>

<div class="faraday-landing">
  <div class="faraday-landing-inner">
    <TopNav />
    <Hero />
    <Manifesto />
    <IndustrialCapacity />
    <TicketPile />
    <LiveSignal />
    <SimulationWorkspace />
    <PRStream />
    <Industries />
    <Footer />
  </div>
</div>
