# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**faraday** — a monorepo that lets software engineers dynamically modify their webapp's UI without relying on forward
deployed engineers to relay user context. Engineers instrument their React app with the package, which communicates with
the webapp backend to surface user requests and push interface changes.

## Monorepo Structure

| Directory       | Purpose                                                                                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `webapp/`       | Backend service that powers the package (API, persistence, auth)                                                                                                                                                                                                                                                |
| `package/`      | TypeScript/React package that engineers install in their applications. Mirrored to the standalone `Faraday-Stack/forge` repo for npm publishing.                                                                                                                                                                |
| `agent-runner/` | Server-side Claude Agent runner that webapp boots inside a Vercel Sandbox to write PRs. Webapp-only consumer; imports its types as `@faraday-stack/agent-runner/types` (workspace dep, resolves to `agent-runner/dist/types.d.ts` — run `pnpm --filter @faraday-stack/agent-runner build` if `dist/` is stale). |
| `demos/`        | Standalone demo apps that consume `package/` to showcase capabilities                                                                                                                                                                                                                                           |

## Publishing the SDK

`package/` is also mirrored to [`Faraday-Stack/forge`](https://github.com/Faraday-Stack/forge) via `git subtree`. That
repo is the source of truth for npm provenance — `npm publish --provenance` attests the artifact against it. Local
development still happens in this monorepo; the standalone repo only exists to host the publish workflow.

To ship a new SDK version:

1. Bump `package/package.json` version, commit.
2. `scripts/sync-forge.sh` — pushes `package/` history to `Faraday-Stack/forge:main`.
3. Create a GitHub Release on `Faraday-Stack/forge` with tag `vX.Y.Z` matching the version. The `release.yml` workflow
   there publishes with provenance via npm Trusted Publishing (OIDC).

The `package/.github/workflows/release.yml` file lives at `package/.github/` in this monorepo so it ships via subtree to
the forge repo's root, where GitHub Actions actually executes it. It is inert in the monorepo (GitHub only runs
workflows from the root `.github/`).

## Architecture

```
demos/         →  package/  →  webapp/  ←Firestore
(example apps)    (SDK)         (backend)
```

- `package/` is the core artifact — it ships to npm and is what end-users install.
- `webapp/` is the server `package/` talks to; it handles storage, auth, and the engineer-facing dashboard.
- `demos/` depend on `package/` locally (workspace link) and run against a local `webapp/` instance.

## Commands

```bash
# root
pnpm install          # install all workspaces

# package/
cd package
pnpm build            # tsup → dist/ (ESM + CJS + .d.ts)
pnpm dev              # tsup --watch
pnpm test             # vitest run (jsdom)
pnpm test:watch       # vitest interactive
pnpm typecheck        # tsc --noEmit

# webapp/ and demos/ — to be filled in once scaffolded
```

## package/ internals

```
src/
├── index.ts                  # public exports only
├── types.ts                  # all shared types (Action, Override, PageSnapshot, …)
├── provider/
│   ├── store.ts              # Zustand store — createAgentStore()
│   ├── context.ts            # React contexts + useAgentStore(), useEndpoint()
│   └── UIAgentProvider.tsx   # root provider; one store per instance
├── modifiable/
│   ├── useModifiable.ts      # registers element, subscribes to overrides
│   └── Modifiable.tsx        # declarative wrapper
├── engine/
│   ├── tools.ts              # TOOL_SCHEMA array sent to the LLM
│   ├── sanitize.ts           # CSS allowlist + injection-pattern checks
│   ├── apply.ts              # dispatchToolUse() — raw tool call → Action → store
│   └── snapshot.ts           # buildSnapshot() / buildSystemPrompt()
├── streaming/
│   └── client.ts             # streamAgentResponse() — fetch-stream parser
├── widget/
│   ├── InlineEditOverlay.tsx # auto-mounted overlay; opens chat panel
│   ├── ChatPanel.tsx         # message list, textarea, send button
│   ├── VoiceInput.tsx        # Web Speech API wrapper
│   └── widget.module.css     # scoped under [data-faraday]
└── utils/
    └── nanoid.ts             # crypto.getRandomValues-based ID generator
```

### Key data flow

1. `useModifiable(id)` registers an element in the Zustand store and subscribes to `overrides[id]`.
2. The inline-edit overlay (auto-mounted by `UIAgentProvider`) opens a chat panel; user types or speaks.
3. `streamAgentResponse()` sends `{ system, tools, messages }` to the host's `endpoint`.
4. The server streams newline-delimited JSON: `{ type: "text_delta" }` or `{ type: "tool_use" }`.
5. `dispatchToolUse()` validates and writes to the store; subscribed hooks re-render immediately.

### Streaming protocol (host backend must implement)

POST to `endpoint` receives:

```json
{ "system": "<prompt>", "tools": [...], "messages": [{"role": "user", "content": "..."}] }
```

Must stream newline-delimited JSON lines:

```
{ "type": "text_delta", "delta": "Making the headline red..." }
{ "type": "tool_use", "name": "applyStyle", "input": { "targetId": "hero", "properties": { "color": "red" } } }
{ "type": "done" }
```

SSE (`data: ...`) format is also accepted.
