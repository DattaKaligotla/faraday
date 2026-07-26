<script lang="ts">
  import SiteNav from "$lib/components/landing/SiteNav.svelte";
  import Thesis from "$lib/components/landing/Thesis.svelte";
  import SiteFooter from "$lib/components/landing/SiteFooter.svelte";
</script>

<svelte:head>
  <title>Thesis - Faraday</title>
  <meta
    name="description"
    content="Why Faraday exists: autonomous workers need RL environments that mirror enterprise operations before they are deployed."
  />
</svelte:head>

<SiteNav />
<Thesis />
<SiteFooter />
