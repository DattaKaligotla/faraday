<p align="center">
  <img src="./static/forge-hero.svg" alt="@faraday-stack/forge" width="100%"/>
</p>

<p align="center">
  <img alt="npm" src="https://img.shields.io/badge/npm-v0.0.3-f97316?style=flat-square&labelColor=0a0b0d"/>
  <img alt="bundle" src="https://img.shields.io/badge/bundle-8.4kb-22c55e?style=flat-square&labelColor=0a0b0d"/>
  <img alt="types" src="https://img.shields.io/badge/types-included-60a5fa?style=flat-square&labelColor=0a0b0d"/>
  <img alt="react" src="https://img.shields.io/badge/react-%E2%89%A518-a78bfa?style=flat-square&labelColor=0a0b0d"/>
  <img alt="license" src="https://img.shields.io/badge/license-PolyForm--NC--1.0-b6bdc7?style=flat-square&labelColor=0a0b0d"/>
</p>

# @faraday-stack/forge

> **forge** is a React SDK + hosted agent. Users describe a UI change in chat — _"hide the priority column"_, _"make the
> CTA red"_, _"rename Inbox to Triage"_ — and the agent applies it to your live app, gated by the rules you set. No
> redeploy. No support ticket. No agent infrastructure for you to run.

---

## The 30-second model

<p align="center">
  <img src="./static/model-diagram.svg" alt="forge architecture: user → hosted agent → your React app" width="100%"/>
</p>

1. You wrap your tree in `<UIAgentProvider>` and tag the elements you want reachable with `<Modifiable>` or
   `useModifiable`.
2. The user types a request in the floating chat. forge ships a snapshot of the modifiable surface to the hosted agent.
3. The agent picks from a small set of tools (`applyStyle`, `setText`, `setVisibility`, `reorder`, `insertComponent`).
4. Each tool call passes through your permission gate before it touches the DOM. Disallowed CSS keys, forbidden ids, and
   unknown components are dropped _before_ render.
5. Overrides persist where you say — `none`, `session`, or `user` (across devices, keyed by your user token).

---

## Install

```bash
pnpm add @faraday-stack/forge
# or: npm i @faraday-stack/forge
# or: yarn add @faraday-stack/forge
```

> Peer deps: `react >=18`, `react-dom >=18`. Node 18+ for the build toolchain.

---

## 30-second example

```tsx
import { UIAgentProvider, useModifiable } from "@faraday-stack/forge";
import "@faraday-stack/forge/style.css";

export function App({ session }) {
  return (
    <UIAgentProvider
      publishableKey={import.meta.env.VITE_FARADAY_PUBLISHABLE_KEY}
      userToken={session.faradayToken}
      permissions={{
        allowedStyleProps: ["color", "background", "fontSize", "padding", "borderRadius"],
        persist: "user",
      }}
    >
      <Hero />
    </UIAgentProvider>
  );
}

function Hero() {
  const { text, style, visible } = useModifiable("hero-title", {
    text: "Welcome",
  });
  if (!visible) return null;
  return <h1 style={style}>{text}</h1>;
}
```

That's the whole loop. The chat widget is rendered by the provider; you don't mount it yourself.

---

## Authenticating the provider

`UIAgentProvider` takes two credentials. Both are required.

| Prop             | Where it comes from                        | Notes                                                                                                       |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `publishableKey` | Faraday dashboard → **Project → API keys** | Safe to ship in client bundles. Identifies your project, not your users. Prefixed `pk_live_` or `pk_test_`. |
| `userToken`      | Your backend, minted per logged-in user    | Short-lived JWT scoped to a single user. Never ship your **secret key** to the client.                      |

```ts
// server — /api/faraday/token
import { mintUserToken } from "@faraday/server";

app.get("/api/faraday/token", requireAuth, async (req, res) => {
  const token = await mintUserToken({
    secretKey: process.env.FARADAY_SECRET_KEY!,
    userId: req.user.id,
    claims: { orgId: req.user.orgId, role: req.user.role },
  });
  res.json({ token });
});
```

> 💡 The provider throws at mount if either credential is missing — fail-fast on misconfiguration in dev.

---

## Exposing elements

Only elements you explicitly mark are reachable by the agent. Two equivalent surfaces:

**Hook** — when you need the override values inside your render logic:

```tsx
const { text, style, visible } = useModifiable("hero-title", {
  text: "Welcome",
  visible: true,
});
```

**Component** — when you just want the element to be modifiable:

```tsx
<Modifiable id="hero-title" as="h1" defaultText="Welcome" />
```

---

## Permissions — the safety surface

The permission gate is the most important config you'll touch. Every tool call passes through it before reaching the
store.

```ts
permissions={{
  allowedStyleProps: ["color", "background", "fontSize", "padding", "borderRadius"],
  maxUndoDepth: 50,
  persist: "user", // "none" | "session" | "user"
}}
```

| Setting             | Effect                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `allowedStyleProps` | Whitelist of CSS keys `applyStyle` may touch. Anything else is dropped silently.                                                                                                     |
| `maxUndoDepth`      | Length of the undo history exposed to the user. Default `50`.                                                                                                                        |
| `persist`           | Where overrides live. `none` discards on reload · `session` uses `sessionStorage` · `user` saves to the Faraday backend keyed by `userToken` so they follow the user across devices. |

---

## Agent tool reference

| Tool              | What it does                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| `applyStyle`      | Set CSS properties on a modifiable element. Filtered by `allowedStyleProps`. |
| `setText`         | Change an element's text content.                                            |
| `setVisibility`   | Show or hide an element.                                                     |
| `reorder`         | Reorder inserted components inside a container.                              |
| `insertComponent` | Insert a registered component into a container.                              |
| `undo`            | Revert the last _N_ actions (capped by `maxUndoDepth`).                      |

---

## API reference

### `<UIAgentProvider>`

Wraps the part of your tree the agent should be able to reach. Mount once, near the root.

```tsx
<UIAgentProvider
  publishableKey="pk_live_…"        // required
  userToken={session.faradayToken}  // required
  components={{ Card, Alert }}      // optional — registered for insertComponent
  permissions={{ … }}               // optional — see above
  onAction={(action) => {}}         // optional — every applied tool call
>
```

| Prop             | Type                            | Required | Default | Description                                                                                  |
| ---------------- | ------------------------------- | :------: | ------- | -------------------------------------------------------------------------------------------- |
| `publishableKey` | `string`                        |    ✓     | —       | Project key from the Faraday dashboard. Prefixed `pk_live_` / `pk_test_`.                    |
| `userToken`      | `string`                        |    ✓     | —       | Short-lived JWT minted server-side via `@faraday/server`'s `mintUserToken`.                  |
| `components`     | `Record<string, ComponentType>` |          | `{}`    | Components the agent may instantiate via `insertComponent`. Anything not listed is rejected. |
| `permissions`    | `PermissionsConfig`             |          | strict  | The safety gate for every tool call. See the Permissions section.                            |
| `onAction`       | `(a: AppliedAction) => void`    |          | `noop`  | Fires once per applied tool call. Use this for audit logging.                                |

### `<Modifiable>`

```tsx
<Modifiable
  id="hero-title" // required — stable across renders
  as="h1" // default "div"
  type="element" // "element" | "container"
  defaultText="Welcome"
  defaultVisible={true}
/>
```

| Prop             | Type                          | Required | Default     | Description                                                                    |
| ---------------- | ----------------------------- | :------: | ----------- | ------------------------------------------------------------------------------ |
| `id`             | `string`                      |    ✓     | —           | Stable identifier. Must be unique within a `UIAgentProvider`.                  |
| `as`             | `keyof JSX.IntrinsicElements` |          | `"div"`     | The HTML tag to render.                                                        |
| `type`           | `"element" \| "container"`    |          | `"element"` | `container` allows `insertComponent` and `reorder` to operate on its children. |
| `defaultText`    | `string`                      |          | `""`        | Initial text. Replaced by overrides from `setText`.                            |
| `defaultVisible` | `boolean`                     |          | `true`      | Initial visibility. `setVisibility` flips this.                                |
| `children`       | `ReactNode`                   |          | —           | Pass children directly when you want full control of the inner markup.         |

### `useModifiable(id, defaults)`

Returns the live override state for an id. Re-renders when the agent applies a change.

```ts
const { text, style, visible, override, reset } = useModifiable("hero-title", {
  text: "Welcome",
  visible: true,
});
```

| Field      | Type                                 | Description                                                 |
| ---------- | ------------------------------------ | ----------------------------------------------------------- |
| `text`     | `string`                             | Current text — your default unless the agent overrode it.   |
| `style`    | `CSSProperties`                      | Current style overrides. Spread directly onto your element. |
| `visible`  | `boolean`                            | `false` if `setVisibility` hid the element.                 |
| `attrs`    | `Record<string, string>`             | Arbitrary attribute overrides (e.g. `aria-label`).          |
| `override` | `(patch: Partial<Override>) => void` | Programmatically apply an override. Rare; prefer the chat.  |
| `reset`    | `() => void`                         | Drop all overrides for this id.                             |

---

## Common patterns

**Test mode in CI** — use `pk_test_…` and `persist: "none"` so changes don't leak between runs.

**Multi-tenant apps** — pass `claims: { orgId }` when minting the user token; the agent will only see overrides scoped
to that org.

**Audit log** — wire `onAction` to your event pipeline. Every tool call lands there with the user, target id, tool name,
and result.

**Server rendering** — the provider is client-only. Render its children server-side as usual; the snapshot is built on
the client after hydration.

---

## Links

- [faradaystack.com](https://www.faradaystack.com)
- [Dashboard](https://app.faradaystack.com)
- [GitHub](https://github.com/Faraday-Stack/forge)
- [Docs](https://www.faradaystack.com/docs)

## License

PolyForm Noncommercial 1.0.0 — free for noncommercial use. Contact us for a commercial license.
