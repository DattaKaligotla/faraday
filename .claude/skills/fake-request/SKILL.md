---
name: fake-request
description:
  Seed a fake end-user request into production Firestore so the dashboard's "Create PR" flow can be exercised
  end-to-end. Use when the user asks to create a fake/seed/test request, populate the dashboard with a sample, or test
  the PR-writing pipeline without driving the SDK.
---

# fake-request

Seeds one fake request into `integrations/{uid}/requests/{id}` matching the shape that
`webapp/src/routes/v1/save/+server.ts` writes when a real user saves a session. The new doc shows up at the top of
`/dashboard/requests` and "Create PR" works against it.

## When to use

The user says something like:

- "create a fake request to test the PR flow"
- "seed a test request in production"
- "populate the dashboard with a sample request"
- "run the fake-request thing for the inbox empty state"

Do NOT use this for anything that writes outside the `requests` subcollection — this only inserts one document.

## How to invoke

The skill wraps `webapp/scripts/seed-fake-request.mjs`. Run it from the repo root:

```bash
cd webapp && node scripts/seed-fake-request.mjs [--preset <name> | --prompt "<text>"] [other flags]
```

The script needs:

- `GOOGLE_APPLICATION_CREDENTIALS` pointing at a Firebase service-account JSON.
- `FIREBASE_PROJECT_ID` (defaults to `faraday-49784`).

If those aren't set, ask the user to export them or `source` their `.env` first; do NOT guess paths.

The script prints the new request id on stdout and a human-readable summary on stderr.

## Args

| Flag                   | Default                 | Notes                                                               |
| ---------------------- | ----------------------- | ------------------------------------------------------------------- |
| `--preset <name>`      | —                       | Use a canned scenario; see list below. Overridable by other flags.  |
| `--prompt "<text>"`    | —                       | Required if `--preset` is not given.                                |
| `--uid <id>`           | the only integration    | Target integration doc id. Required if multiple integrations exist. |
| `--page-url <url>`     | `https://example.test/` | Surfaced as Page URL in the dashboard.                              |
| `--origin <url>`       | derived from page-url   |                                                                     |
| `--user-id <sub>`      | `demo-user-1`           | End-user id (sub claim).                                            |
| `--user-email <e>`     | none                    |                                                                     |
| `--org-id <id>`        | none                    |                                                                     |
| `--org-name <n>`       | none                    |                                                                     |
| `--target <id>`        | `demo-target`           | Target id used in the synthesized toolCall + modifiables.           |
| `--tool <name>`        | `applyStyle`            | `applyStyle` or `insertComponent`.                                  |
| `--status <s>`         | `applied`               | `applied`, `responded`, or `failed`.                                |
| `--assistant "<text>"` | `""`                    | Optional assistant message.                                         |

## Presets

- `inbox-empty-state` — Northwind/Midday-style "empty inbox is too plain" request.
- `pricing-cta-color` — Acme pricing CTA color tweak.
- `settings-header-copy` — Lattice settings page subtitle.

Run `node scripts/seed-fake-request.mjs --help` to see the live preset list.

## What you should do when invoked

1. Pick a preset based on the user's intent, or build a freeform request from their description (prompt + page-url +
   target + a plausible org/user). Don't pile on optional flags the user didn't ask for.
2. Confirm the resulting command back to the user before running — this writes to PRODUCTION Firestore.
3. After running, report the new request id and remind the user it is now visible at `/dashboard/requests`.

## What you should NOT do

- Do not invent presets that aren't in `PRESETS`. Either use one that exists or pass `--prompt` directly.
- Do not loop the script to seed many requests unless the user explicitly asks.
- Do not modify documents other than the new one this script creates.
