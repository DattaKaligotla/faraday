# faraday

Let your users reshape the interface — without filing a ticket.

Faraday is a monorepo for a React SDK that gives software engineers a direct line between their users and their UI.
Engineers instrument their app with the package; users click a chat widget and describe what they want changed; an AI
agent modifies the interface live while the response streams in.

The goal is to eliminate the forward-deployed engineer relay loop: instead of a user → FDE → engineer → deploy chain,
changes happen in the session.

## Packages

| Directory               | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| [`package/`](./package) | `@faraday-stack/forge` — the React SDK engineers install  |
| `webapp/`               | Backend service (API, auth, persistence) the SDK talks to |
| `demos/`                | Standalone apps that demonstrate the SDK                  |

## How it works

```
User speaks or types in the chat widget
  → SDK sends messages + page snapshot to your backend endpoint
  → Your backend proxies to an LLM with the tool schema
  → LLM streams text + tool calls back
  → SDK applies tool calls to the page in real time
```

The SDK never holds an API key. All LLM communication goes through an endpoint you own.

## Getting started

```bash
pnpm install
```

See [`package/README.md`](./package/README.md) for SDK integration docs.

## Running the demos

The `demos/` directory contains three standalone React apps that exercise the SDK against a mock streaming endpoint — no
real backend required.

### Prerequisites

- Node.js 18+
- pnpm 8+

### 1. Install dependencies

From the repo root, install all workspaces at once:

```bash
pnpm install
```

### 2. Build the package

The demos import from `@faraday-stack/forge`'s built output, so build it first:

```bash
pnpm build:package
```

To keep the package rebuilding automatically while you work on it:

```bash
cd package && pnpm dev
```

### 3. Start a demo

Each demo runs on its own port. Open a new terminal and run:

```bash
# Sparse marketing landing page — port 5173
cd demos/landing-page && pnpm dev

# Dense analytics dashboard — port 5174
cd demos/analytics-dashboard && pnpm dev

# E-commerce product page — port 5175
cd demos/ecommerce && pnpm dev
```

Then open the URL printed by Vite (e.g. `http://localhost:5173`).

### 4. Use the chat widget

Click the floating button in the bottom-right corner to open the chat panel. Type a request like:

- _"Make the headline red"_
- _"Hide the features section"_
- _"Change the CTA button text to 'Try it now'"_

The mock endpoint streams a canned acknowledgement back — actual style and text changes won't apply until a real LLM
backend is wired up, but the widget, streaming parser, and store plumbing all exercise normally.

### Demo overview

| Demo                  | Port | Modifiable elements                                                                                                        |
| --------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------- |
| `landing-page`        | 5173 | Nav logo, hero headline + subheadline, CTA buttons, feature cards, CTA banner                                              |
| `analytics-dashboard` | 5174 | Page title, 4 KPI cards, bar chart, data table rows, sidebar nav links; registers `AlertBanner` as an insertable component |
| `ecommerce`           | 5175 | Product name, price, description, add-to-cart button, product image block, review cards                                    |

### Wiring up a real backend

Replace the mock endpoint with your own server. Each demo's `UIAgentProvider` points to `/mock-stream` — handled locally
by Vite's dev server middleware. To hit a real backend, change the `endpoint` prop in the demo's `src/App.tsx`:

```tsx
<UIAgentProvider endpoint="http://localhost:8000/v1/stream">
```

Your endpoint must accept `POST` with body `{ system, tools, messages }` and stream newline-delimited JSON:

```
{ "type": "text_delta", "delta": "Making the headline red..." }
{ "type": "tool_use", "name": "applyStyle", "input": { "targetId": "hero-headline", "properties": { "color": "red" } } }
{ "type": "done" }
```
