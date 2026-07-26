<script lang="ts">
  import { onMount } from "svelte";
  import "./docs.css";

  type Manager = "pnpm" | "npm";
  let manager = $state<Manager>("pnpm");
  const installCmd: Record<Manager, string> = {
    pnpm: "pnpm add @faraday-stack/forge",
    npm: "npm install @faraday-stack/forge",
  };

  onMount(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>(".faraday-docs .toc-link");
    const navLinks = document.querySelectorAll<HTMLAnchorElement>(".faraday-docs .side .nav-link");
    const sections = [...links]
      .map((link) => {
        const href = link.getAttribute("href");
        return href ? document.querySelector(href) : null;
      })
      .filter((element): element is Element => element !== null);

    function onScroll() {
      let cur: Element | null = sections[0] ?? null;
      for (const s of sections) {
        if (s.getBoundingClientRect().top < 120) cur = s;
      }
      if (!cur) return;
      const id = "#" + cur.id;
      links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
      navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === id));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  });
</script>

<svelte:head>
  <title>@faraday-stack/forge: Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Fraunces:opsz,wght@9..144,500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="faraday-docs">
  <div class="layout">
    <!-- ───── sidebar nav ───── -->
    <aside class="side">
      <div class="brand">
        <div class="brand-mark">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <rect x="5" y="6" width="22" height="2" fill="#fff" />
            <rect x="5" y="15" width="22" height="2" fill="#fff" />
            <rect x="5" y="24" width="22" height="2" fill="#fff" />
            <rect x="6" y="5" width="2" height="22" fill="#fff" />
            <rect x="15" y="5" width="2" height="22" fill="#fff" />
            <rect x="24" y="5" width="2" height="22" fill="#fff" />
          </svg>
        </div>
        <div>
          <div class="brand-name">FaradayStack</div>
          <div class="brand-pkg">@faraday-stack/forge</div>
        </div>
        <span class="ver-pill">v0.4</span>
      </div>

      <div class="nav-section">Get started</div>
      <a class="nav-link active" href="#overview">Overview</a>
      <a class="nav-link" href="#install">Installation</a>
      <a class="nav-link" href="#quickstart">Quick start</a>

      <div class="nav-section">Auth</div>
      <a class="nav-link" href="#auth">Authenticating</a>
      <a class="nav-link" href="#publishable-key">Publishable key</a>
      <a class="nav-link" href="#user-token">Minting user tokens</a>

      <div class="nav-section">Reference</div>
      <a class="nav-link nav-mono" href="#provider">UIAgentProvider</a>
      <a class="nav-link nav-mono" href="#modifiable">Modifiable</a>
      <a class="nav-link nav-mono" href="#use-modifiable">useModifiable</a>
      <a class="nav-link" href="#components">Insertable components</a>
      <a class="nav-link" href="#tools">Agent tools</a>

      <div class="nav-section">Workflow</div>
      <a class="nav-link" href="#dev">Development</a>
      <a class="nav-link" href="#release">Releasing</a>
    </aside>

    <!-- ───── main content ───── -->
    <main>
      <div class="crumb">
        <a href="/">← home</a><span class="sep">/</span><a href="/docs">docs</a><span class="sep">/</span><span
          >@faraday-stack/forge</span
        ><span class="sep">/</span><span style="color:var(--text-2)">Overview</span>
      </div>

      <section id="overview">
        <div class="hero">
          <div>
            <h1>Reshape the <span class="em">UI</span>, no redeploy.</h1>
            <p class="lede">
              <code>@faraday-stack/forge</code> is a React SDK that lets your users describe interface changes — hide a column,
              rename a label, recolor a header — and an agent applies them live, scoped to the elements you opt in.
            </p>
            <div class="hero-meta">
              <a
                class="meta-pill"
                href="https://www.npmjs.com/package/@faraday-stack/forge"
                target="_blank"
                rel="noreferrer noopener"><span class="dot"></span>npm · v0.1.0</a
              >
              <span class="meta-pill">react ≥18</span>
              <span class="meta-pill">react-dom ≥18</span>
              <span class="meta-pill">node ≥18</span>
              <span class="meta-pill">MIT</span>
              <span class="meta-pill">~24 kB gz</span>
            </div>
          </div>
          <div class="install-block">
            <div class="install-label">install</div>
            <div class="install-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={manager === "pnpm"}
                class="install-tab"
                class:active={manager === "pnpm"}
                onclick={() => (manager = "pnpm")}>pnpm</button
              >
              <button
                type="button"
                role="tab"
                aria-selected={manager === "npm"}
                class="install-tab"
                class:active={manager === "npm"}
                onclick={() => (manager = "npm")}>npm</button
              >
            </div>
            <div class="install-cmd">
              <span><span class="arrow">></span> {installCmd[manager]}</span>
              <button type="button" class="copy" onclick={() => navigator.clipboard?.writeText(installCmd[manager])}
                >copy</button
              >
            </div>
          </div>
        </div>

        <p>
          Engineers wrap parts of the tree with <code>&lt;Modifiable&gt;</code> or the
          <code>useModifiable</code>
          hook. Users open a floating chat widget, describe what they want changed, and the agent edits the interface while
          its response streams in. All requests route through the FaradayStack backend. We take care of all the agent infrastructure
          yourself.
        </p>
      </section>

      <h2 id="install"><span class="num">01</span>Installation</h2>
      <p>Install the package and import the stylesheet once at your app's root.</p>

      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">bash</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body"><span class="tk-cmt"># add to your project</span>
pnpm add @faraday-stack/forge

<span class="tk-cmt"># or with npm / yarn / bun</span>
npm install @faraday-stack/forge</pre>
      </div>

      <p>
        Peer dependencies: <code>react ≥18</code>, <code>react-dom ≥18</code>. The SDK is tree-shakable and ships ESM +
        CJS with full type defs.
      </p>

      <h2 id="quickstart"><span class="num">02</span>Quick start</h2>
      <p>
        Wrap your app in a provider, then mark elements as modifiable. Anything not marked is invisible to the agent.
      </p>

      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">app.tsx</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body"><span class="tk-key">import</span> {"{"}
  <span class="tk-cmp">UIAgentProvider</span>,
  <span class="tk-cmp">Modifiable</span>,
  <span class="tk-fn">useModifiable</span>,
{"}"} <span class="tk-key">from</span> <span class="tk-str">"@faraday-stack/forge"</span>;
<span class="tk-key">import</span> <span class="tk-str">"@faraday-stack/forge/style.css"</span>;

<span class="tk-key">function</span> <span class="tk-fn">App</span>() {"{"}
  <span class="tk-key">return</span> (
    <span class="tk-tag">&lt;UIAgentProvider</span>
      <span class="tk-prop">publishableKey</span>={"{"}<span class="tk-fn">import</span>.<span class="tk-prop"
            >meta</span
          >.<span class="tk-prop">env</span>.<span class="tk-prop">VITE_FARADAY_PUBLISHABLE_KEY</span>{"}"}
      <span class="tk-prop">userToken</span>={"{"}currentUser.<span class="tk-prop">faradayToken</span>{"}"}
      <span class="tk-prop">permissions</span>={"{{"}
        <span class="tk-prop">allowedStyleProps</span>: [<span class="tk-str">"color"</span>, <span class="tk-str"
            >"background"</span
          >, <span class="tk-str">"fontSize"</span>, <span class="tk-str">"padding"</span>, <span class="tk-str"
            >"borderRadius"</span
          >],
        <span class="tk-prop">persist</span>: <span class="tk-str">"user"</span>,
      {"}}"}
    <span class="tk-tag">&gt;</span>
      <span class="tk-tag">&lt;Hero /&gt;</span>
    <span class="tk-tag">&lt;/UIAgentProvider&gt;</span>
  );
{"}"}

<span class="tk-key">function</span> <span class="tk-fn">Hero</span>() {"{"}
  <span class="tk-key">const</span> {"{"} text, style, visible {"}"} = <span class="tk-fn">useModifiable</span>(<span
            class="tk-str">"hero-title"</span
          >, {"{"}
    <span class="tk-prop">text</span>: <span class="tk-str">"Welcome"</span>,
  {"}"});
  <span class="tk-key">if</span> (!visible) <span class="tk-key">return null</span>;
  <span class="tk-key">return</span> <span class="tk-tag">&lt;h1</span> <span class="tk-prop">style</span
          >={"{"}style{"}"}<span class="tk-tag">&gt;</span>{"{"}text{"}"}<span class="tk-tag">&lt;/h1&gt;</span>;
{"}"}</pre>
      </div>

      <div class="callout">
        <span class="callout-icon">></span>
        <div class="callout-body">
          Once mounted, the floating chat widget is enabled for any user whose <code>userToken</code> is valid. Element selection
          is opt-in — only IDs you register show up in the agent's page snapshot.
        </div>
      </div>

      <h2 id="auth"><span class="num">03</span>Authenticating the provider</h2>
      <p>
        The provider takes two credentials: a <strong>publishable key</strong> that identifies your project, and a
        <strong>user token</strong> minted on your backend per logged-in user.
      </p>

      <table>
        <thead>
          <tr><th>Prop</th><th>Source</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>publishableKey<span class="req">●</span></td>
            <td>Dashboard → API keys</td>
            <td>Safe to ship in client bundles. Identifies your project, not your users.</td>
          </tr>
          <tr>
            <td>userToken<span class="req">●</span></td>
            <td>Your backend, per session</td>
            <td>Short-lived JWT scoped to one user. Mint server-side and pass to React.</td>
          </tr>
          <tr>
            <td>permissions</td>
            <td>—</td>
            <td>CSS allow-list, undo depth, and persistence mode.</td>
          </tr>
          <tr>
            <td>components</td>
            <td>—</td>
            <td>Registry of components the agent can insert into containers.</td>
          </tr>
          <tr>
            <td>onAction</td>
            <td>—</td>
            <td>Callback fired after every applied agent action.</td>
          </tr>
        </tbody>
      </table>

      <div class="callout warn">
        <span class="callout-icon">!</span>
        <div class="callout-body">
          <strong>Both are required.</strong> The provider throws at mount if <code>publishableKey</code> is missing, or
          if it's set without a <code>userToken</code>.
        </div>
      </div>

      <h3 id="publishable-key">Getting a publishable key</h3>
      <ol>
        <li>Sign in at <a href="/dashboard">app.faraday.dev</a>.</li>
        <li>Create or select a project.</li>
        <li>
          Open <strong>API keys</strong> and copy the value prefixed with <code>pk_live_</code> (production) or
          <code>pk_test_</code> (test mode).
        </li>
        <li>
          Put it in an env var your bundler exposes to the client — e.g.
          <code>VITE_FARADAY_PUBLISHABLE_KEY</code> or <code>NEXT_PUBLIC_FARADAY_PUBLISHABLE_KEY</code>.
        </li>
      </ol>

      <h3 id="user-token">Minting user tokens</h3>
      <p>
        User tokens are short-lived JWTs you generate on your backend using your <strong>secret key</strong>
        (kept server-side, never shipped). A typical Express handler:
      </p>

      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">server / api / faraday / token.ts</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body"><span class="tk-key">import</span> {"{"} <span class="tk-fn">mintUserToken</span
          > {"}"} <span class="tk-key">from</span> <span class="tk-str">"@faraday/server"</span>;

app.<span class="tk-fn">get</span>(<span class="tk-str">"/api/faraday/token"</span>, requireAuth, <span class="tk-key"
            >async</span
          > (req, res) =&gt; {"{"}
  <span class="tk-key">const</span> token = <span class="tk-key">await</span> <span class="tk-fn">mintUserToken</span
          >({"{"}
    <span class="tk-prop">secretKey</span>: process.<span class="tk-prop">env</span>.<span class="tk-prop"
            >FARADAY_SECRET_KEY</span
          >!,
    <span class="tk-prop">userId</span>: req.<span class="tk-prop">user</span>.<span class="tk-prop">id</span>,
    <span class="tk-cmt">// optional: claims surfaced to the agent</span>
    <span class="tk-prop">claims</span>: {"{"} <span class="tk-prop">orgId</span>: req.<span class="tk-prop">user</span
          >.<span class="tk-prop">orgId</span>, <span class="tk-prop">role</span>: req.<span class="tk-prop">user</span
          >.<span class="tk-prop">role</span> {"}"},
  {"}"});
  res.<span class="tk-fn">json</span>({"{"} token {"}"});
{"}"});</pre>
      </div>

      <p>
        Fetch the token after login and feed it to the provider. Refresh on a timer or when the SDK reports an expired
        token via <code>onAction</code>.
      </p>

      <h2 id="provider"><span class="num">04</span>UIAgentProvider</h2>
      <p>
        The root of every FaradayStack-enabled tree. Wires up the agent runtime, opens a websocket to the FaradayStack
        backend, mounts the chat widget, and exposes the override store via context to all descendants.
      </p>

      <div class="sig">
        <span class="cmt">// signature</span>
        <span class="key">function</span> <span class="name">UIAgentProvider</span>(props:
        <span class="type">UIAgentProviderProps</span>): <span class="type">JSX.Element</span>
      </div>

      <h3>Props</h3>
      <div class="ref">
        <div class="ref-row head">
          <div class="ref-key">Prop · type · default</div>
          <div class="ref-val">Description</div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">publishableKey <span class="req-tag">required</span></div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            Your project's public-side identifier (<code>pk_live_…</code> or <code>pk_test_…</code>). Safe to ship in
            client bundles. Throws at mount if missing.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">userToken <span class="req-tag">required</span></div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            Short-lived JWT minted by your backend, scoped to one user. The agent runtime uses it to authenticate every
            action and to key persisted overrides. Refresh on expiry.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">children <span class="req-tag">required</span></div>
            <div class="ref-type">React.ReactNode</div>
          </div>
          <div class="ref-val">
            The subtree that should be reachable by the agent. Anything outside the provider is invisible to it.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">permissions <span class="opt-tag">optional</span></div>
            <div class="ref-type">PermissionsConfig</div>
            <div class="ref-default"><b>default:</b> see below</div>
          </div>
          <div class="ref-val">
            What the agent is allowed to do.
            <div class="sub">
              <code>allowedStyleProps: string[]</code> — CSS properties <code>applyStyle</code> may write. Default:
              <code>[]</code> (style edits disabled).
            </div>
            <div class="sub">
              <code>maxUndoDepth: number</code> — actions retained for the <code>undo</code> tool. Default:
              <code>50</code>.
            </div>
            <div class="sub">
              <code>persist: "none" | "session" | "user"</code> — where overrides live. Default:
              <code>"none"</code>.
            </div>
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">components <span class="opt-tag">optional</span></div>
            <div class="ref-type">Record&lt;string, ComponentEntry&gt;</div>
            <div class="ref-default"><b>default:</b> {"{}"}</div>
          </div>
          <div class="ref-val">
            Registry of components the agent can insert into containers via <code>insertComponent</code>.
            <div class="sub">
              Each entry:
              <code>{"{"} component: ComponentType, propsSchema: Record&lt;string, string&gt; {"}"}</code>. Schema
              strings use a pipe-union syntax: <code>"info|warn|error"</code>.
            </div>
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">onAction <span class="opt-tag">optional</span></div>
            <div class="ref-type">(action: AgentAction) =&gt; void</div>
          </div>
          <div class="ref-val">
            Fires synchronously after every applied agent action. Use it for analytics, audit logs, or to detect
            <code>"token_expired"</code> errors and refresh the JWT.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">onError <span class="opt-tag">optional</span></div>
            <div class="ref-type">(err: AgentError) =&gt; void</div>
          </div>
          <div class="ref-val">
            Catches non-fatal runtime errors (failed action, dropped websocket, schema mismatch). If unset, errors log
            to <code>console.warn</code>.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">widget <span class="opt-tag">optional</span></div>
            <div class="ref-type">"floating" | "inline" | false</div>
            <div class="ref-default"><b>default:</b> "floating"</div>
          </div>
          <div class="ref-val">
            Controls how the chat surface mounts. <code>"inline"</code> renders nothing — you mount
            <code>&lt;AgentChat /&gt;</code> yourself. <code>false</code> disables the widget entirely (programmatic-only).
          </div>
        </div>
      </div>

      <h3>Returns</h3>
      <p>
        A JSX element that renders <code>children</code> wrapped in two contexts: <code>OverrideStoreContext</code>
        (read by every <code>Modifiable</code> / <code>useModifiable</code> descendant) and
        <code>AgentRuntimeContext</code> (the websocket + tool dispatcher). When <code>widget</code> is enabled, also renders
        the floating chat surface as a sibling.
      </p>

      <h2 id="modifiable"><span class="num">05</span>&lt;Modifiable&gt; component</h2>
      <p>
        The declarative way to mark an element as agent-reachable. Use this when the element is a plain leaf — a
        heading, paragraph, image — and you don't need the override values in your own render logic.
      </p>

      <div class="sig">
        <span class="cmt">// signature</span>
        <span class="key">function</span> <span class="name">Modifiable</span>(props:
        <span class="type">ModifiableProps</span>): <span class="type">JSX.Element | null</span>
      </div>

      <h3>Props</h3>
      <div class="ref">
        <div class="ref-row head">
          <div class="ref-key">Prop · type · default</div>
          <div class="ref-val">Description</div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">id <span class="req-tag">required</span></div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            Stable identifier the agent uses to address the element. Must be unique within the page snapshot. Reusing an
            id across mounts re-binds to the same override record.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">as <span class="opt-tag">optional</span></div>
            <div class="ref-type">keyof JSX.IntrinsicElements | ComponentType</div>
            <div class="ref-default"><b>default:</b> "div"</div>
          </div>
          <div class="ref-val">
            The host element to render. Strings map to native tags (<code>"h1"</code>, <code>"aside"</code>); component
            refs render that component with overrides spread as props.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">type <span class="opt-tag">optional</span></div>
            <div class="ref-type">"leaf" | "container"</div>
            <div class="ref-default"><b>default:</b> "leaf"</div>
          </div>
          <div class="ref-val">
            <code>"container"</code> opts the element into <code>insertComponent</code> and <code>reorder</code> tools. Leaves
            only accept text/style/visibility edits.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">defaultText <span class="opt-tag">optional</span></div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            Initial text content rendered until the agent (or a persisted override) replaces it.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">defaultStyle <span class="opt-tag">optional</span></div>
            <div class="ref-type">React.CSSProperties</div>
          </div>
          <div class="ref-val">Baseline style merged behind any agent overrides. Agent-set keys win on conflict.</div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">defaultVisible <span class="opt-tag">optional</span></div>
            <div class="ref-type">boolean</div>
            <div class="ref-default"><b>default:</b> true</div>
          </div>
          <div class="ref-val">
            Whether the element renders before the agent decides otherwise. <code>false</code> hides it until
            <code>setVisibility</code> reveals it.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">label <span class="opt-tag">optional</span></div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            Human-readable hint surfaced to the agent in the page snapshot. Improves targeting accuracy when ids are
            opaque (e.g. UUIDs).
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">children <span class="opt-tag">optional</span></div>
            <div class="ref-type">React.ReactNode</div>
          </div>
          <div class="ref-val">
            For containers, the static children rendered around any agent-inserted components. Ignored on leaves when
            <code>defaultText</code> is set.
          </div>
        </div>
      </div>

      <h3>Returns</h3>
      <p>
        A JSX element of type <code>as</code>, or <code>null</code> when the merged visibility is <code>false</code>.
        The element receives merged style, current text content, and a <code>data-faraday-id</code> attribute used by the
        runtime to scroll the agent's focus pill into view.
      </p>

      <h2 id="use-modifiable"><span class="num">06</span>useModifiable hook</h2>
      <p>
        The imperative form of <code>&lt;Modifiable&gt;</code>. Call it inside a component to subscribe to the agent's
        overrides for a given id, then apply the returned values yourself. Use this when you need the values in your own
        render logic — conditional rendering, animation, prop forwarding, etc.
      </p>

      <div class="sig">
        <span class="cmt">// signature</span>
        <span class="key">function</span> <span class="name">useModifiable</span>( id: <span class="type">string</span>,
        defaults?: <span class="type">ModifiableDefaults</span>):
        <span class="type">ModifiableState</span>
      </div>

      <h3>Parameters</h3>
      <div class="ref">
        <div class="ref-row head">
          <div class="ref-key">Param · type · default</div>
          <div class="ref-val">Description</div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">id <span class="req-tag">required</span></div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            Stable identifier shared with any matching <code>&lt;Modifiable&gt;</code> in the page snapshot. The hook registers
            the id on mount and unregisters on unmount.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">defaults <span class="opt-tag">optional</span></div>
            <div class="ref-type">ModifiableDefaults</div>
            <div class="ref-default"><b>default:</b> {"{}"}</div>
          </div>
          <div class="ref-val">
            Initial values returned until the agent (or persistence layer) provides an override.
            <div class="sub"><code>text?: string</code> — fallback text content.</div>
            <div class="sub">
              <code>style?: React.CSSProperties</code> — baseline style merged behind agent overrides.
            </div>
            <div class="sub"><code>visible?: boolean</code> — initial visibility. Default: <code>true</code>.</div>
            <div class="sub"><code>label?: string</code> — agent-facing hint.</div>
          </div>
        </div>
      </div>

      <h3>Return value — <code>ModifiableState</code></h3>
      <div class="ref">
        <div class="ref-row head">
          <div class="ref-key">Field · type</div>
          <div class="ref-val">Functionality</div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">text</div>
            <div class="ref-type">string</div>
          </div>
          <div class="ref-val">
            The current text content. Equal to <code>defaults.text</code> until <code>setText</code> overrides it. Render
            this directly in your JSX so streaming agent edits appear live.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">style</div>
            <div class="ref-type">React.CSSProperties</div>
          </div>
          <div class="ref-val">
            Merged style object: <code>defaults.style</code> overlaid with agent <code>applyStyle</code> results,
            filtered through <code>allowedStyleProps</code>. Spread it onto the host element's <code>style</code> prop.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">visible</div>
            <div class="ref-type">boolean</div>
          </div>
          <div class="ref-val">
            Current visibility. Toggled by the <code>setVisibility</code> tool. Convention: early-return
            <code>null</code> when this is <code>false</code> so the element drops out of the tree (and out of the agent's
            snapshot).
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">attrs</div>
            <div class="ref-type">{"{"} "data-faraday-id": string {"}"}</div>
          </div>
          <div class="ref-val">
            Spread onto your host element so the runtime can locate it for the focus pill, scroll-into-view, and
            outline-on-hover behaviors. Required for visual feedback during streaming edits.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">override</div>
            <div class="ref-type">Override | undefined</div>
          </div>
          <div class="ref-val">
            The raw override record (timestamp, author, action history) — useful for showing "edited by agent" badges,
            diffing against defaults, or building your own undo UI.
          </div>
        </div>

        <div class="ref-row">
          <div class="ref-key">
            <div class="ref-name">reset</div>
            <div class="ref-type">() =&gt; void</div>
          </div>
          <div class="ref-val">
            Imperatively clears the override for this id, reverting to <code>defaults</code>. Useful for per-element
            "reset to original" affordances.
          </div>
        </div>
      </div>

      <div class="callout">
        <span class="callout-icon">›</span>
        <div class="callout-body">
          Both <code>&lt;Modifiable&gt;</code> and <code>useModifiable</code> register the element in the agent's page snapshot
          on mount and unregister on unmount. Unmounted ids are silently dropped from any in-flight tool call.
        </div>
      </div>

      <h3>Combined example</h3>
      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">hero.tsx</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body"><span class="tk-key">function</span> <span class="tk-fn">Hero</span>() {"{"}
  <span class="tk-key">const</span> {"{"} text, style, visible, attrs, override, reset {"}"} =
    <span class="tk-fn">useModifiable</span>(<span class="tk-str">"hero-title"</span>, {"{"}
      <span class="tk-prop">text</span>: <span class="tk-str">"Welcome"</span>,
      <span class="tk-prop">style</span>: {"{"} <span class="tk-prop">fontSize</span>: <span class="tk-num">48</span
          > {"}"},
    {"}"});

  <span class="tk-key">if</span> (!visible) <span class="tk-key">return null</span>;

  <span class="tk-key">return</span> (
    <span class="tk-tag">&lt;header&gt;</span>
      <span class="tk-tag">&lt;h1</span> {"{"}...attrs{"}"} <span class="tk-prop">style</span>={"{"}style{"}"}<span
            class="tk-tag">&gt;</span
          >{"{"}text{"}"}<span class="tk-tag">&lt;/h1&gt;</span>
      {"{"}override &amp;&amp; <span class="tk-tag">&lt;button</span> <span class="tk-prop">onClick</span
          >={"{"}reset{"}"}<span class="tk-tag">&gt;</span>Revert<span class="tk-tag">&lt;/button&gt;</span>{"}"}
    <span class="tk-tag">&lt;/header&gt;</span>
  );
{"}"}</pre>
      </div>

      <h2 id="components"><span class="num">07</span>Insertable components</h2>
      <p>
        If you want the agent to insert new components — not just restyle existing ones — register them in the <code
          >components</code
        > map and mark a container.
      </p>

      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">tsx</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body"><span class="tk-tag">&lt;UIAgentProvider</span>
  <span class="tk-prop">publishableKey</span>={"{"}<span class="tk-fn">import</span>.<span class="tk-prop">meta</span
          >.<span class="tk-prop">env</span>.<span class="tk-prop">VITE_FARADAY_PUBLISHABLE_KEY</span>{"}"}
  <span class="tk-prop">userToken</span>={"{"}session.<span class="tk-prop">faradayToken</span>{"}"}
  <span class="tk-prop">components</span>={"{{"}
    <span class="tk-cmp">Card</span>: {"{"} <span class="tk-prop">component</span>: Card,  <span class="tk-prop"
            >propsSchema</span
          >: {"{"} <span class="tk-prop">title</span>: <span class="tk-str">"string"</span>, <span class="tk-prop"
            >body</span
          >: <span class="tk-str">"string"</span> {"}"} {"}"},
    <span class="tk-cmp">Alert</span>: {"{"} <span class="tk-prop">component</span>: Alert, <span class="tk-prop"
            >propsSchema</span
          >: {"{"} <span class="tk-prop">variant</span>: <span class="tk-str">"info|warn|error"</span>, <span
            class="tk-prop">message</span
          >: <span class="tk-str">"string"</span> {"}"} {"}"},
  {"}}"}
<span class="tk-tag">&gt;</span>
  <span class="tk-tag">&lt;Modifiable</span> <span class="tk-prop">id</span>=<span class="tk-str">"sidebar"</span> <span
            class="tk-prop">as</span
          >=<span class="tk-str">"aside"</span> <span class="tk-prop">type</span>=<span class="tk-str">"container"</span
          > <span class="tk-tag">/&gt;</span>
<span class="tk-tag">&lt;/UIAgentProvider&gt;</span></pre>
      </div>

      <h2 id="tools"><span class="num">08</span>Available agent tools</h2>
      <p>
        The agent has six built-in tools, dispatched on every prompt. <code>applyStyle</code> only passes CSS keys
        listed in <code>allowedStyleProps</code> — everything else is dropped before it reaches the store.
      </p>

      <div class="tool-grid">
        <div class="tool-card">
          <div class="tool-name">
            <span class="tool-dot" style="background:var(--purple)"></span>applyStyle
          </div>
          <div class="tool-desc">
            Set CSS properties on a modifiable element. Filtered through
            <code style="font-size:11px">allowedStyleProps</code>.
          </div>
        </div>
        <div class="tool-card">
          <div class="tool-name">
            <span class="tool-dot" style="background:var(--blue)"></span>setText
          </div>
          <div class="tool-desc">Change the text content of an element.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">
            <span class="tool-dot" style="background:var(--red)"></span>setVisibility
          </div>
          <div class="tool-desc">
            Show or hide an element. Hidden nodes return
            <code style="font-size:11px">visible:false</code>.
          </div>
        </div>
        <div class="tool-card">
          <div class="tool-name">
            <span class="tool-dot" style="background:var(--green)"></span>reorder
          </div>
          <div class="tool-desc">Reorder inserted components inside a marked container.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">
            <span class="tool-dot" style="background:var(--amber)"></span>insertComponent
          </div>
          <div class="tool-desc">Insert a registered component into a container with typed props.</div>
        </div>
        <div class="tool-card">
          <div class="tool-name">
            <span class="tool-dot" style="background:var(--text-3)"></span>undo
          </div>
          <div class="tool-desc">
            Revert the last N actions, bounded by
            <code style="font-size:11px">maxUndoDepth</code>.
          </div>
        </div>
      </div>

      <h2 id="dev"><span class="num">09</span>Development</h2>
      <p>From the <code>package/</code> directory:</p>

      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">bash</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body">pnpm build            <span class="tk-cmt"># build to dist/</span>
pnpm dev              <span class="tk-cmt"># watch mode</span>
pnpm test             <span class="tk-cmt"># run tests (jsdom)</span>
pnpm typecheck        <span class="tk-cmt"># tsc --noEmit</span>
pnpm lint             <span class="tk-cmt"># eslint src</span>
pnpm lint:publish     <span class="tk-cmt"># publint — validates published metadata</span>
pnpm check:exports    <span class="tk-cmt"># arethetypeswrong — validates dist resolution</span></pre>
      </div>

      <h2 id="release"><span class="num">10</span>Releasing</h2>
      <p>Releases are driven by Changesets. When you make a user-visible change to this package:</p>

      <div class="code">
        <div class="code-head">
          <div class="lights"><span></span><span></span><span></span></div>
          <span class="lang">bash</span>
          <span class="copy-btn">copy</span>
        </div>
        <pre class="code-body">pnpm changeset</pre>
      </div>

      <p>
        Pick <code>patch</code>, <code>minor</code>, or <code>major</code> and write a one-line consumer-facing summary.
        Commit the generated <code>.changeset/*.md</code> file with your PR.
      </p>

      <div class="callout">
        <span class="callout-icon">›</span>
        <div class="callout-body">
          After your PR merges to <code>main</code>, the <code>release</code> workflow opens (or updates) a
          <strong>Version Packages</strong>
          PR that bumps <code>package.json</code> and rewrites
          <code>CHANGELOG.md</code>. Merging that PR publishes to npm with provenance and creates a GitHub Release.
          <strong>No manual <code>npm publish</code> needed.</strong>
        </div>
      </div>

      <div class="page-foot">
        <a class="foot-link" href="#overview">
          <span class="k">‹ Top</span>
          <span class="v">Overview</span>
        </a>
        <a class="foot-link next" href="/dashboard">
          <span class="k">Next ›</span>
          <span class="v">Open the dashboard</span>
        </a>
      </div>
    </main>

    <!-- ───── TOC ───── -->
    <aside class="toc">
      <div class="toc-title">On this page</div>
      <a class="toc-link active" href="#overview">Overview</a>
      <a class="toc-link" href="#install">Installation</a>
      <a class="toc-link" href="#quickstart">Quick start</a>
      <a class="toc-link" href="#auth">Authenticating</a>
      <a class="toc-link" href="#publishable-key" style="padding-left:18px;font-size:11.5px">Publishable key</a>
      <a class="toc-link" href="#user-token" style="padding-left:18px;font-size:11.5px">Minting user tokens</a>
      <a class="toc-link" href="#provider">Provider options</a>
      <a class="toc-link" href="#modifiable">Exposing elements</a>
      <a class="toc-link" href="#components">Insertable components</a>
      <a class="toc-link" href="#tools">Agent tools</a>
      <a class="toc-link" href="#dev">Development</a>
      <a class="toc-link" href="#release">Releasing</a>

      <div class="toc-foot">
        <a href="https://www.npmjs.com/package/@faraday-stack/forge" target="_blank" rel="noreferrer noopener"
          ><span>↗</span> npm package</a
        >
      </div>
    </aside>
  </div>
</div>
