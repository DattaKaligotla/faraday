# webapp

The Faraday webapp — a single SvelteKit app that serves both the engineer-facing dashboard (landing page, sign-in,
request log, integration management) and the SaaS API consumed by the Faraday SDK in customer apps.

```
SDK in customer app  ──►  /v1/{stream,load,save}  ──►  Anthropic on Bedrock + Firestore
                                                            ▲
engineer browser     ──►  /, /login, /dashboard  ──►  /api/*
```

This replaces the previous split (Vite static frontend + FastAPI Python backend). One process, one deploy.

## Stack

- SvelteKit 2 / Svelte 5 (runes)
- `adapter-node` — runs anywhere Node 20+ runs
- Tailwind 4 (utility classes available; pages use scoped CSS for the existing design)
- Firebase Auth (client SDK) for engineers, Firebase Admin for ID-token verification
- Firestore (`firebase-admin/firestore`) for persistence
- HS256 JWTs for SDK end-user auth
- Anthropic on Bedrock for streaming + codegen
- In-memory sliding-window rate limit (per `integration × org`)

## Layout

```
src/
├── app.html, app.d.ts
├── hooks.server.ts                  # CORS for /v1/*
├── lib/
│   ├── firebase.ts                  # client Firebase init
│   ├── auth.ts                      # signIn / signOut / getUser / requireAuth
│   ├── api.ts                       # authedFetch (attaches Firebase ID token)
│   ├── utils.ts                     # relTime, originHost
│   ├── components/
│   │   ├── Logo.svelte
│   │   └── landing/                 # Hero, Problem, Steps, Outcomes, EmailCapture, …
│   └── server/
│       ├── firestore.ts             # admin Firestore singleton
│       ├── firebase-admin.ts        # ID-token verification
│       ├── sdk-auth.ts              # publishable-key + HS256 JWT + origin
│       ├── github-oauth.ts          # signed-state OAuth flow
│       ├── anthropic.ts             # Bedrock streaming + codegen
│       ├── rate-limit.ts            # 429 + Retry-After
│       ├── models.ts                # shared types
│       ├── auth-guard.ts            # requireDashboardUser()
│       └── serialize.ts             # public-safe Firestore document views
└── routes/
    ├── +page.svelte                 # marketing landing
    ├── login/+page.svelte
    ├── dashboard/                   # auth-gated client-side
    │   ├── +layout.{svelte,ts}      # sidebar, redirects to /login if not signed in
    │   ├── requests/                # request log w/ filters, codegen, delete
    │   ├── integration/             # publishable key, GitHub OAuth, repo picker
    │   ├── repos/                   # tracked repos (read-only)
    │   ├── team/, settings/         # placeholders
    ├── api/                         # dashboard endpoints (Firebase ID token required)
    │   ├── integration/{,github/{,start,callback,repos}}
    │   ├── requests/{,[id]/{,codegen}}
    │   └── …
    ├── v1/                          # SaaS endpoints (publishable key + JWT + Origin)
    │   ├── stream/                  # NDJSON Anthropic streaming
    │   ├── load/                    # restore last saved snapshot
    │   └── save/                    # persist a user request
    └── health/                      # simple liveness probe
```

## Setup

```sh
# from the monorepo root
pnpm install
```

Then in `webapp/`:

1. Copy `.env.example` → `.env` and fill in values.
2. Drop a Firebase Admin service account JSON into `webapp/` and point `GOOGLE_APPLICATION_CREDENTIALS` at it. The
   pattern `*-firebase-adminsdk-*.json` is gitignored.
3. Register a GitHub OAuth App at https://github.com/settings/developers with the callback URL
   `http://localhost:5173/api/integration/github/callback`. Put `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in `.env`.
4. Provide static AWS credentials in `.env`: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION`. The webapp
   uses these to mint short-term Bedrock API bearer tokens (`@aws/bedrock-token-generator`) for every outbound call and
   for sandboxed runners — raw access keys never leave the webapp host. All keys must be declared in `.env` (even if
   empty) since env vars are statically inlined at build time.

## Commands

```sh
pnpm dev          # vite dev — http://localhost:5173
pnpm build        # adapter-node → build/
pnpm preview      # serve the built app locally
pnpm check        # svelte-kit sync && svelte-check
node build        # run the production server (after pnpm build)
```

## Environment

Env vars are loaded via `$env/static/private` — values are read from `.env` at build time and inlined into the bundle.
**Changing any variable requires a rebuild** (`pnpm build`); restarting `node build/index.js` alone won't pick up
changes.

Every variable referenced from code must be declared in `.env`, even if empty. The full list lives in `.env.example`.

| Variable                                                            | Purpose                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`                                               | Firestore + Firebase Auth project (default: `faraday-49784`)                                                                                                                             |
| `GOOGLE_APPLICATION_CREDENTIALS`                                    | Path to a Firebase Admin service account JSON                                                                                                                                            |
| `ALLOWED_ORIGINS`                                                   | Comma-separated origin allow-list for `/v1/*` CORS (localhost is always allowed)                                                                                                         |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `GITHUB_REDIRECT_URI` | OAuth App credentials                                                                                                                                                                    |
| `FRONTEND_URL`                                                      | Where the GitHub OAuth callback redirects back to (e.g. `http://localhost:5173`)                                                                                                         |
| `SESSION_SECRET`                                                    | HMAC key for signing OAuth state tokens (any random string)                                                                                                                              |
| `AWS_REGION`                                                        | Bedrock region (default `us-east-1`)                                                                                                                                                     |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`                       | Static IAM user credentials. Used to mint short-term Bedrock bearer tokens; never forwarded to sandboxes.                                                                                |
| `BEDROCK_MODEL`                                                     | Model ID, default `us.anthropic.claude-sonnet-4-5-20250929-v1:0`                                                                                                                         |
| **PR-job dispatch (Vercel Sandbox)** — required for "Create PR"     |                                                                                                                                                                                          |
| `FARADAY_SOURCE_TOKEN`                                              | Fine-grained PAT (Contents: Read) on the **faraday** repo. Used to clone the source into the sandbox.                                                                                    |
| `BLOB_READ_WRITE_TOKEN`                                             | Vercel Blob token used to cache prepared workspace snapshots                                                                                                                             |
| `FIREBASE_SERVICE_ACCOUNT_BASE64`                                   | Base64-encoded Firebase service account JSON. Used by the webapp's `firebase-admin` init AND forwarded to the sandbox runner under `FARADAY_FIREBASE_SA_BASE64` so it can mirror events. |
| `FARADAY_AGENT_REF`                                                 | Optional: pin the sandbox to a specific faraday commit/branch (defaults to `VERCEL_GIT_COMMIT_SHA` then `main`)                                                                          |
| `FARADAY_SNAPSHOT_MAX_BYTES`                                        | Optional cap on cached snapshot size                                                                                                                                                     |

The agent runs exclusively on Bedrock. The dispatcher mints a short-term bearer per dispatch and forwards only
`AWS_BEARER_TOKEN_BEDROCK` + `AWS_REGION` into the sandbox; `CLAUDE_CODE_USE_BEDROCK=1` is forced inside the runner
itself. The legacy `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AWS_BEARER_TOKEN_BEDROCK`, `AWS_SESSION_TOKEN`, and
`CLAUDE_CODE_USE_BEDROCK` env vars are no longer read.

Every variable used by the dispatcher (Bedrock, GitHub App, Firebase, snapshot cache, source clone) is imported via
`$env/static/private`, which means **the SvelteKit build fails outright if any are missing from `.env`** — there are no
runtime fallbacks. The shape of `process.env` inside the sandbox is owned by `RunnerEnvironment` in
`package/agent-runner/src/types.ts`; the dispatcher constructs a literal of that exact type and the runner casts
`process.env` to it.

## Streaming protocol

`POST /v1/stream` accepts `{ system, tools, messages }` and returns `application/x-ndjson` — newline-delimited JSON
events:

```
{"type":"text_delta","delta":"…"}
{"type":"tool_use","name":"applyStyle","input":{…}}
{"type":"done"}
```

`tool_use` blocks come from the model's final message with their full inputs assembled. On error, the stream ends with
`{"type":"error","message":"…"}`. The package emits the same shape its `<UIAgentProvider>` already understands.

## Auth flows

**Dashboard (`/api/*`)** — Engineer signs in via Firebase email/password on `/login`. Pages under `/dashboard` redirect
to `/login` if no session. Every `/api/*` request carries `Authorization: Bearer <Firebase ID token>`, verified
server-side by `firebase-admin`.

**SDK (`/v1/*`)** — Customer app sends `x-faraday-key: <publishableKey>` plus `Authorization: Bearer <userToken>`
(HS256-signed by the customer's backend with the project's `secretKey`). Anonymous (no Bearer) is allowed; the `Origin`
header is checked against the project's `allowedOrigins` (localhost is always allowed). Rate limiting is per
`(integration, org)` pair, sliding window for both per-minute and per-day limits.

**GitHub OAuth** — Three-legged flow signed with `SESSION_SECRET` (10-min state TTL). Access tokens are stored under
`integrations/{uid}.github.accessToken` in Firestore and never sent to the browser.

## Data model

```
integrations/{uid}                                # one per engineer
  publishableKey, secretKey, ownerId, ownerEmail,
  allowedOrigins[], plan, rateLimits, createdAt,
  github { login, githubUserId, accessToken, linkedRepos[], connectedAt }

integrations/{uid}/requests/{id}                  # one per saved end-user request
  prompt, assistantText, toolCalls[], status, error,
  endUserId, endUserEmail, endUserClaims,
  orgId, orgName, origin, projectId, pageContext,
  savedSnapshot { overrides, insertedComponents },
  messages[], createdAt,
  pr { jobId, status, phase, repoFullName, branch, url, number,
       summary, error, startedAt, openedAt, lastEventAt }

integrations/{uid}/requests/{id}/events/{auto-id}  # job event log
  seq, jobId, ts, type, …event-specific fields

integrations/{uid}/repos/{repoId}                  # one per linked GitHub repo
  repoFullName, graphRef, status, error,
  startedAt, generatedAt, lastEventAt,
  graph { components[], edges[], files, parsedFiles, skippedFiles } | null
```

`pr.status` is the request-level state machine: absent → `running` → `pr_opened` | `failed`. `pr.phase` is the
finer-grained step the runner reports inside `running` (`preparing → agent_running → opening_pr → uploading_snapshot`).
`pr.lastEventAt` is the liveness signal — the runner mirror touches it on every event emitted, and the next-dispatch
precondition (below) reads it to decide whether a job is still alive.

Event docs use Firestore auto-ids so two jobs on the same request can't overwrite each other's history. The `seq` field
is the cursor consumers order on — it's wall-clock-anchored (`jobStartMs + idx`) so it stays strictly increasing across
jobs even when retries land in the same subcollection. The events GET endpoint at
`routes/api/requests/[id]/events/+server.ts` filters with `where('seq', '>', after).orderBy('seq', 'asc')` — neither the
doc id nor the originating jobId is part of the cursor.

## PR-job dispatch

Clicking **Create PR** on `/dashboard/requests` does the following on the server:

1. `POST /api/requests/[id]/pr` (`webapp/src/routes/api/requests/[id]/pr/+server.ts`) verifies the dashboard user,
   applies the dispatch preconditions below in a Firestore transaction, mints an installation token for the linked
   customer repo, and hands off to `dispatchJob`.
2. `dispatchJob` (`webapp/src/lib/server/sandbox-dispatch.ts`) boots a Vercel Sandbox, clones the **faraday** repo into
   `/vercel/sandbox`, runs `pnpm install` for the `@faraday-stack/agent-runner` workspace, then `mkDir`s
   `/vercel/sandbox/.faraday-work` as the runner's WORKDIR.
3. The runner (`agent-runner/src/sandbox-entry.ts`) is spawned with `cwd: /vercel/sandbox` (NOT WORKDIR — prepare
   deletes WORKDIR before recreating it, so spawning from inside it strands every git/pnpm subprocess on a deleted
   inode).
4. The runner clones the customer repo into WORKDIR, runs the Claude Agent SDK, commits, opens a PR, and uploads a
   workspace snapshot to Vercel Blob.

### Dispatch preconditions (idempotency)

The transaction in step 1 reads the request's existing `pr` map and decides whether to start a new job, in this order:

| Existing `pr.status`                                                       | Decision                                                                                                                                                                                |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _missing_, or `"failed"`                                                   | Proceed: write a fresh `pr` map with new `jobId`, `status: "running"`, `startedAt`, `lastEventAt` (seeded so the next 90-second window starts now).                                     |
| `"pr_opened"`                                                              | **409 Conflict.** A PR was already opened for this request. Overwriting would clobber `pr.url` / `pr.number` / `pr.branch`, so the user must delete the request and re-create to retry. |
| `"running"` and `lastEventAt` is younger than `ACTIVE_JOB_GRACE_MS` (90 s) | **409 Conflict.** A job is still emitting events; let it finish.                                                                                                                        |
| `"running"` and `lastEventAt` is older than 90 s                           | Proceed: the previous job is presumed dead (sandbox crashed before mirroring a terminal event), so we overwrite the `pr` map with a fresh dispatch.                                     |

`lastEventAt` is the liveness signal because the runner's Firestore mirror touches it on every event
(`agent-runner/src/sandbox-entry.ts`). A healthy slow run keeps refreshing it; an abandoned `running` flag decays past
the window in ~90 s and unblocks retries. The longer-tail cleanup (jobs that never even started emitting) is handled
separately by the cron reaper at `api/cron/reap-stale-jobs` with a 30-min / 10-min idle window.

### Required env (production)

The full set is in the env table above; the ones easy to forget when first turning this on are: `FARADAY_SOURCE_TOKEN`
(else the private faraday clone 400s), one of the two **agent provider** paths (else the agent SDK exits 1),
`FIREBASE_SERVICE_ACCOUNT_BASE64` (else event mirror is silent), `BLOB_READ_WRITE_TOKEN` (else snapshot caching no-ops).

**Agent provider.** The runner uses the Claude Agent SDK, which switches between direct Anthropic and Bedrock based on
env. The dispatcher forwards either path:

- _Anthropic direct:_ set `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`).
- _Bedrock:_ set `AWS_BEARER_TOKEN_BEDROCK` (or the standard `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` chain) plus
  `AWS_REGION`. The dispatcher auto-injects `CLAUDE_CODE_USE_BEDROCK=1` whenever any Bedrock credential is present, so
  you don't have to set it explicitly. Use a Bedrock model id in `ANTHROPIC_MODEL` (e.g.
  `us.anthropic.claude-sonnet-4-5-20250929-v1:0`).

The `starting agent-runner` log line reports `provider=bedrock|anthropic|none` so you can verify the dispatcher resolved
the path you expect.

### Progress to the dashboard

Two channels:

- **SSE** from `POST /api/requests/[id]/pr` to the initiating tab (low-latency).
- **Durable replay** via `GET /api/requests/[id]/events?after=<seq>`, backed by the `events` subcollection. The
  dashboard polls this every 2s while a job is running so progress survives refresh / cross-device.

The runner writes `pr.phase` and `pr.lastEventAt` on the parent doc as it transitions through
`preparing → agent_running → opening_pr → uploading_snapshot → done|failed`. The dashboard renders a phase stepper plus
a humanized timeline (`PRProgress.svelte`). A tee in `pr/+server.ts` also mirrors any pre-runner `failed` event to
`pr.status`, so a `Sandbox.create`/install/runner-runCommand failure can't leave the doc stuck.

### Observability

All dispatch logs go through a single LogLayer instance (`webapp/src/lib/server/logger.ts`). In Vercel logs, filter by:

- `component=pr-dispatch` — route handler lifecycle (token mint, snapshot lookup, handoff, terminal mirroring).
- `component=sandbox-dispatch` — sandbox boot, install, runner kickoff, dispatch end.
- `component=sandbox-output` — raw stdout/stderr captured from inside the sandbox. Combine with `phase=install|runner`
  and `stream=stdout|stderr` to narrow further.

Each line carries `jobId` (and where applicable `uid` / `requestId`) so concurrent jobs are easy to disentangle.

### Stale-job reaper

`webapp/src/routes/api/cron/reap-stale-jobs/+server.ts` runs daily and marks any `pr.status === "running"` job as
`failed` if it has no `pr.lastEventAt` within the last 10 minutes (and `pr.startedAt` is older than 30 minutes).
Active-but-slow agents keep heartbeating via the Firestore mirror and aren't reaped.

### Seeding fake requests

`webapp/scripts/seed-fake-request.mjs` inserts a request matching the shape that `routes/v1/save/+server.ts` writes, so
the Create PR flow can be exercised without driving the SDK. The Claude Code skill at `.claude/skills/fake-request`
wraps it.

## Context Graph

The Context Graph at `/dashboard/graph` is a per-repo map of React components and the render-children edges between
them. Components that register `<Modifiable>` elements (or call `useModifiable("id", …)`) get an accent border and a
badge with the count of registered ids — so the engineer can see at a glance which parts of the customer's app the
in-page agent (and therefore the PR-writing agent) can actually touch. Updates are manual: a Refresh button per repo. No
webhooks, no polling, no SDK consumption today — this is a v1 viewer for engineers.

### Architecture

A single helper module is the only place that talks to GitHub or Firestore for graph data:

```
webapp/src/lib/server/repo-graphs.ts
  getRepoGraph(uid, repoId)        -> SerializedRepoGraph | null   (Firestore read, single)
  listRepoGraphs(uid)              -> Record<repoId, …>             (Firestore read, all)
  buildAndStoreRepoGraph(uid, id)  -> SerializedRepoGraph           (full write path)
```

Two surfaces consume it:

- `webapp/src/routes/dashboard/graph/+page.server.ts` exports a `load` function (calls `listRepoGraphs`) and a `refresh`
  form action (calls `buildAndStoreRepoGraph`).
- `webapp/src/routes/dashboard/graph/+page.svelte` renders the data and posts the form.

There is **no `+server.ts` route** for graphs. The dashboard is the only consumer; SvelteKit's load/action shape covers
both reads and writes more cleanly than an API route, and there's only ever one body of code per concern.

The parser/analyzer that turns a tarball into a graph lives in `webapp/src/lib/server/component-graph.ts`. It's a pure
async generator with no Firestore or HTTP coupling — `repo-graphs.ts` wires it to `fetchRepoTarball`
(`webapp/src/lib/server/github-api.ts`) on input and to the Firestore writer on output. The parser uses `@babel/parser`
with the `typescript` and `jsx` plugins, walks each file's AST for top-level component declarations
(function/arrow/class), records JSX render edges by tag name resolved against the file's import map, and captures
`<Modifiable id="…">` props plus `useModifiable("id", …)` calls (including renamed imports like
`import { Modifiable as M }`) attributing each registration to the enclosing component.

### The page loader (`+page.server.ts`)

The loader is the most subtle piece, read this carefully if you're touching the page or adding similar features.

```ts
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");

  const integrationSnap = await getDb().collection("integrations").doc(locals.user.uid).get();
  const data = parseDoc(integrationSnap, integrationDocSchema, "integration");
  const github = data?.github?.installationId ? serializeGithub(data.github) : null;

  return { github, graphs: listRepoGraphs(locals.user.uid) };
};
```

Two things going on:

**1. `github` is `await`ed; `graphs` is not.** The `github` value is needed to render the page chrome (the repo
`<select>`, the empty state when no repos are linked). Without it, the page can't draw anything useful. So the loader
awaits that single Firestore read and returns the resolved value.

The `graphs` value is a `Promise<Record<string, SerializedRepoGraph>>` returned **un-awaited**. SvelteKit detects the
Promise in the load return value and _streams_ it — the SSR response starts with the resolved keys (`github`) inlined
into the HTML, then keeps the connection open and sends the `graphs` resolution as a separate chunk when the Firestore
query completes. The client deserializes both as they arrive. This is documented under "Streaming with promises" in the
SvelteKit load docs.

The reason this matters: a user who clicks Refresh and then reloads the page sees the chrome (sidebar, page header, repo
selector with options populated, "Refresh" button) before the graph data lands. On a small Firestore read that's a
non-issue, but the same shape generalizes — for any future graph-adjacent data that's slow (large doc, network egress,
heavy serialize) the chrome stays interactive while the slow part streams.

**2. The loader does not call the parser.** It only reads what's already stored in Firestore. The build path is a
separate code path (the `refresh` form action). This keeps the loader bounded to a single Firestore read; you never
accidentally trigger a 30-second tarball download by visiting the page.

In `+page.svelte`, the streamed `graphs` Promise is consumed with an `{#await}` block:

```svelte
{#await data.graphs}
  <div class="canvas-skeleton">Loading graphs…</div>
{:then graphs}
  {@const current = selectedRepoId ? (graphs[selectedRepoId] ?? null) : null}
  …status chips, <GraphPanel graph={current} />…
{:catch error}
  <div class="alert error">Failed to load graphs: {error.message}</div>
{/await}
```

During SSR the pending branch renders ("Loading graphs…"), then the resolved branch hydrates on the client when the
streamed chunk arrives. If the Firestore read rejects (auth lapsed, permissions, etc.), the catch branch shows the error
inline rather than falling through to a 500 page.

The `selectedRepoId` is page-component `$state` — it's set by an `$effect` to the first linked repo when
`gh.linkedRepos` becomes available, and bound to the `<select>`. It exists _outside_ the `{#await}` block so it doesn't
get reset every time the loader streams a new value (e.g., after a Refresh-triggered `invalidateAll`).

### The refresh form action

The action lives next to `load` in `+page.server.ts`:

```ts
export const actions: Actions = {
  refresh: async ({ locals, request }) => {
    if (!locals.user) throw redirect(303, "/login");
    const form = await request.formData();
    const repoId = form.get("repoId");
    if (typeof repoId !== "string" || !repoId) return fail(400, { message: "Missing repoId" });
    try {
      await buildAndStoreRepoGraph(locals.user.uid, repoId);
      return { ok: true };
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      const message = (error as Error).message;
      return fail(status, { repoId, message });
    }
  },
};
```

The page submits to it with progressive enhancement:

```svelte
<form
  method="POST"
  action="?/refresh"
  use:enhance={() => {
    refreshing = true;
    return async ({ update }) => {
      await update(); // re-runs `load`, re-streaming `graphs`
      refreshing = false;
    };
  }}
>
  <input type="hidden" name="repoId" value={selectedRepoId ?? ""} />
  <button class="btn-primary" disabled={refreshing || !selectedRepoId}>Refresh</button>
</form>
```

`use:enhance` calls `invalidateAll()` on a successful action, which re-runs the page loader, which re-streams
`data.graphs` from Firestore — so the new graph appears as soon as the action returns without a manual `fetch` from the
page.

`fail(...)` returns surface as the page's `form` prop and render the inline error banner. They do _not_ trigger the
catch branch of the `{#await}` — that branch is reserved for loader rejections.

### Build preconditions and durability

Inside `buildAndStoreRepoGraph`, before any tarball work happens, a Firestore transaction enforces a
single-build-per-repo invariant:

| Existing `repo.status`                                                     | Decision                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| _missing_, `"idle"`, or `"failed"`                                         | Proceed: stamp `status: "building"`, `startedAt`, `lastEventAt`. |
| `"building"` and `lastEventAt` younger than `ACTIVE_BUILD_GRACE_MS` (60 s) | **409 Conflict.** A build is in-flight and emitting heartbeats.  |
| `"building"` and `lastEventAt` older than 60 s                             | Proceed: previous build presumed dead, stamp a fresh one.        |

While the parser runs, the helper writes `lastEventAt: serverTimestamp()` after each parser progress event so a slow
build keeps the doc looking alive. On success the writer flips `status: "idle"` with the assembled graph and a fresh
`generatedAt`. On thrown error it flips `status: "failed"` with the error message; the next Refresh click sails through
immediately (status is `"failed"`, not `"building"`).

### What happens when the user navigates mid-build

Because the build is awaited inside the form action handler, the work is _server-side_ and not tied to the page's UI
lifecycle. When the user navigates away mid-build:

1. The browser cancels the in-flight POST. `use:enhance` aborts on the client.
2. The Vercel Function keeps running. The action handler's `await buildAndStoreRepoGraph(...)` doesn't observe the
   request cancellation today — neither `getBranchHead` nor `fetchRepoTarball` is wired to `event.request.signal`, and
   neither is the parser or the Firestore writes — so the build runs to completion (or hits `maxDuration: 300`).
3. Firestore is the durable record. The next time the user opens `/dashboard/graph`, the loader re-fetches from
   Firestore and shows the completed graph.

The single failure mode is a Vercel-side function kill (`maxDuration` exceeded, very rare platform-level cancel). That
leaves `status: "building"` and a stale `lastEventAt` in Firestore. Recovery: the 60-second `ACTIVE_BUILD_GRACE_MS`
window in the precondition lets the next Refresh click run a fresh build cleanly. There is no cron reaper for stuck
graph builds today (unlike the PR-job reaper); a stuck doc persists until the next manual Refresh.

### Files

- `webapp/src/lib/server/repo-graphs.ts` — single source of truth (read + write).
- `webapp/src/lib/server/component-graph.ts` — pure tarball-to-graph parser.
- `webapp/src/lib/server/github-api.ts` — `getBranchHead` and `fetchRepoTarball` helpers.
- `webapp/src/lib/server/schemas.ts` — `repoGraphRecordSchema`, `componentGraphSchema`, etc.
- `webapp/src/lib/server/serialize.ts` — `serializeRepoGraph` (Timestamp → ISO string).
- `webapp/src/routes/dashboard/graph/+page.server.ts` — `load` + `actions.refresh`.
- `webapp/src/routes/dashboard/graph/+page.svelte` — the page (selector, form, `{#await}`, status chips).
- `webapp/src/routes/dashboard/graph/GraphPanel.svelte` — `<SvelteFlow>` canvas + dagre-style top-down layout.
- `webapp/src/routes/dashboard/graph/ComponentNode.svelte` — `@xyflow/svelte` custom node renderer with the Modifiable
  accent + badge.
