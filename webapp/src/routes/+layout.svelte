<script lang="ts">
  import { dev } from "$app/environment";
  import { injectAnalytics } from "@vercel/analytics/sveltekit";
  import "./layout.css";
  import { ModeWatcher } from "mode-watcher";

  // Vercel Analytics removed for local dev — its `@vercel/analytics/sveltekit`
  // entry uses a `"svelte"`-only conditional export that newer Vite doesn't
  // resolve. Re-enable for production by re-adding the import + injectAnalytics
  // call below, and add `'svelte'` to vite's resolve.conditions.
  let { children } = $props();
  injectAnalytics({ mode: dev ? "development" : "production" });
</script>

<ModeWatcher />
{@render children()}
