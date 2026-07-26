---
name: shadcn-svelte
description:
  Provides design-system context and component reference for shadcn-svelte work in the faraday webapp. Use whenever you
  are building, modifying, or reviewing Svelte UI in webapp/ — picking a component, adding one via the CLI, theming,
  dark mode, or composing forms — so the work matches the installed design system instead of inventing custom UI.
---

# shadcn-svelte

The faraday `webapp/` is a SvelteKit + Tailwind v4 + Svelte 5 app using **shadcn-svelte** (v1.2.7) as its design system.
Components are copy-pasted into the repo via the CLI rather than imported from a package. This skill exists so UI work
in `webapp/` reuses that system instead of recreating styles.

## When to use

- Building or editing any `.svelte` UI in `webapp/`.
- The user asks for a UI element that maps to a known component (button, dialog, dropdown, table, form, toast, sidebar,
  etc.) — pick the shadcn-svelte component first.
- Theming, CSS variables, dark mode, or `components.json` questions.
- Adding a new component to the project (`pnpm dlx shadcn-svelte@latest add <name>`).

Pair this with the `svelte` MCP server for Svelte 5 syntax/runes correctness; this skill covers the design-system layer.

## Working rules

1. **Prefer existing components over custom markup.** Check `webapp/src/lib/components/ui/` (the install path) before
   writing new styled elements. The full component catalog with descriptions is in `reference.md`.
2. **Install via CLI from `webapp/`**, not by hand:
   ```bash
   cd webapp && pnpm dlx shadcn-svelte@latest add <component>
   ```
   This writes to `src/lib/components/ui/<component>/` and updates imports.
3. **Imports use `$lib`**: `import { Button } from "$lib/components/ui/button";`.
4. **Tailwind v4** is in use — theme tokens are CSS variables in `src/app.css`, not `tailwind.config.js`. Customize
   colors/radii there. See https://shadcn-svelte.com/docs/theming.md and `migration/tailwind-v4.md`.
5. **Svelte 5 runes**: components are written with `$props`, `$state`, `$derived`. When extending a component, match
   this style.
6. **Forms**: use Formsnap + Superforms + Zod (the shadcn-svelte form pattern), not ad-hoc form state.
7. **Dark mode** uses the `mode-watcher` pattern documented at `dark-mode/svelte.md`. Don't re-roll a theme toggle.
8. **Don't restyle primitives.** If a component looks wrong, tweak via the `class` prop / CSS variables, not by editing
   the generated component file unless the change is intentional and project-wide.

## Fetching official docs

When you need the exact API or example for a component, fetch the matching `.md` from
`https://shadcn-svelte.com/docs/...`. The full URL map is in `reference.md`. Prefer those docs over memorized APIs — the
library moves.

## Quick lookups

- CLI reference → https://shadcn-svelte.com/docs/cli.md
- `components.json` → https://shadcn-svelte.com/docs/components-json.md
- Theming / CSS vars → https://shadcn-svelte.com/docs/theming.md
- Tailwind v4 migration notes → https://shadcn-svelte.com/docs/migration/tailwind-v4.md
- Full component index with URLs → `reference.md` (in this skill)
