<script lang="ts">
  import "./dashboard.css";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import AppSidebar from "$lib/components/AppSidebar.svelte";

  let { data, children } = $props();
</script>

<Sidebar.Provider>
  <AppSidebar user={data.user} />
  <Sidebar.Inset>
    <div class="dash-shell">
      <main>
        <div class="page-bar">
          <Sidebar.Trigger />
        </div>
        {@render children()}
      </main>
    </div>
  </Sidebar.Inset>
</Sidebar.Provider>
