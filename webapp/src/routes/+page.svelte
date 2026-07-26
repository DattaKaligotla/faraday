<script lang="ts">
  import "$lib/components/landing/landing.css";
  import TopNav from "$lib/components/landing/TopNav.svelte";
  import Hero from "$lib/components/landing/Hero.svelte";
  import Manifesto from "$lib/components/landing/Manifesto.svelte";
  import TicketPile from "$lib/components/landing/TicketPile.svelte";
  import LiveSignal from "$lib/components/landing/LiveSignal.svelte";
  import SimulationWorkspace from "$lib/components/landing/SimulationWorkspace.svelte";
  import PRStream from "$lib/components/landing/PRStream.svelte";
  import Footer from "$lib/components/landing/Footer.svelte";
</script>

<svelte:head>
  <title>Faraday - RL Environments for Enterprise Autonomy</title>
  <meta
    name="description"
    content="Faraday builds reinforcement-learning environments that mirror Fortune 500 operations so AI agents and robots can train before deployment."
  />
</svelte:head>

<div class="faraday-landing">
  <div class="faraday-landing-inner">
    <TopNav />
    <Hero />
    <Manifesto />
    <TicketPile />
    <LiveSignal />
    <SimulationWorkspace />
    <PRStream />
    <Footer />
  </div>
</div>
