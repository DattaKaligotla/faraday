<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import Logo from "$lib/components/Logo.svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { signOut } from "$lib/auth";

  interface Props {
    user: { uid: string; email: string | null } | null;
  }
  let { user }: Props = $props();

  const email = $derived(user?.email ?? "");
  const localPart = $derived(email.split("@")[0] || "there");
  const initial = $derived((localPart[0] || "?").toUpperCase());
  const route = $derived(page.url.pathname);

  function isActive(prefix: string): boolean {
    return route === prefix || route.startsWith(prefix + "/");
  }

  async function handleSignOut() {
    await signOut();
    await goto("/login", { replaceState: true });
  }
</script>

<Sidebar.Root collapsible="icon">
  <Sidebar.Header class="px-0 py-3 group-data-[collapsible=icon]:py-2">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton class="px-6" size="lg" tooltipContent="FaradayStack">
          {#snippet child({ props })}
            <a href="/dashboard" {...props} class="brand-lockup">
              <Logo size={16} variant="mark" />
              <span class="brand-text group-data-[collapsible=icon]:hidden">
                faraday<span class="brand-suffix">/stack</span>
              </span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>

  <Sidebar.Content>
    <Sidebar.Group class="px-0">
      <Sidebar.GroupLabel class="px-6">Workspace</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/requests")} tooltipContent="User Requests">
              {#snippet child({ props })}
                <a href="/dashboard/requests" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg
                  >
                  <span>User Requests</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/analytics")} tooltipContent="Analytics">
              {#snippet child({ props })}
                <a href="/dashboard/analytics" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><path d="M3 3v18h18" /><path d="M7 15l3-5 4 3 5-8" /></svg
                  >
                  <span>Analytics</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>

    <Sidebar.Group class="px-0">
      <Sidebar.GroupLabel class="px-6">Admin</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/team")} tooltipContent="Team">
              {#snippet child({ props })}
                <a href="/dashboard/team" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path
                      d="M23 21v-2a4 4 0 0 0-3-3.87"
                    /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg
                  >
                  <span>Team</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/integration")} tooltipContent="Integration">
              {#snippet child({ props })}
                <a href="/dashboard/integration" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path
                      d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                    /></svg
                  >
                  <span>Integration</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/tenants")} tooltipContent="Tenants">
              {#snippet child({ props })}
                <a href="/dashboard/tenants" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path
                      d="M9 9v.01"
                    /><path d="M9 12v.01" /><path d="M9 15v.01" /><path d="M9 18v.01" /></svg
                  >
                  <span>Tenants</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/repos")} tooltipContent="Tracked Repos">
              {#snippet child({ props })}
                <a href="/dashboard/repos" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" /></svg
                  >
                  <span>Tracked Repos</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/graph")} tooltipContent="Context Graph">
              {#snippet child({ props })}
                <a href="/dashboard/graph" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line
                      x1="8.59"
                      y1="13.51"
                      x2="15.42"
                      y2="17.49"
                    /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg
                  >
                  <span>Context Graph</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>

          <Sidebar.MenuItem>
            <Sidebar.MenuButton class="px-6" isActive={isActive("/dashboard/settings")} tooltipContent="Settings">
              {#snippet child({ props })}
                <a href="/dashboard/settings" {...props}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    ><circle cx="12" cy="12" r="3" /><path
                      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    /></svg
                  >
                  <span>Settings</span>
                </a>
              {/snippet}
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer class="px-0">
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton class="px-6" size="lg" tooltipContent={email}>
          <div
            class="flex aspect-square size-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground"
          >
            {initial}
          </div>
          <div class="grid flex-1 text-left text-sm leading-tight">
            <span class="truncate font-medium">{localPart}</span>
            <span class="truncate text-xs text-muted-foreground">{email}</span>
          </div>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton class="px-6" onclick={handleSignOut} tooltipContent="Sign out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            ><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line
              x1="21"
              y1="12"
              x2="9"
              y2="12"
            /></svg
          >
          <span>Sign out</span>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Footer>
  <Sidebar.Rail />
</Sidebar.Root>

<style>
  :global(.brand-lockup) {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
  }
  :global(.brand-text) {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.005em;
    color: var(--text);
    line-height: 1;
  }
  :global(.brand-suffix) {
    color: var(--accent);
    font-weight: 600;
  }
</style>
