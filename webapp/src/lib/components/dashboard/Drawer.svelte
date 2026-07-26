<script lang="ts">
  import { toolMeta, targetIdFromCall, PHASE_KEYS, PHASE_SHORT_LABEL, phaseIndex } from "$lib/dashboard/utils";
  import { relTime } from "$lib/utils";
  import type { RequestItem, ToolCall, PrInfo } from "$lib/dashboard/types";
  import type { JobEvent } from "@faraday-stack/agent-runner/types";
  import PRProgress from "$lib/components/PRProgress.svelte";

  interface Props {
    r: RequestItem | null | undefined;
    events: JobEvent[];
    inFlight: boolean;
    onClose: () => void;
    onAction: (kind: "create-pr" | "retry-pr" | "copy-id" | "delete", r: RequestItem) => void;
  }
  let { r, events, inFlight, onClose, onAction }: Props = $props();

  function isHexColor(v: string): boolean {
    return /^#[0-9a-f]{3,8}$/i.test(v);
  }
</script>

{#if !r}
  <aside class="drawer drawer-empty">
    <div class="drawer-empty-inner">
      <div class="empty-glyph">⌖</div>
      <div class="empty-title">Select a request</div>
      <div class="empty-sub">
        Click a row, or use <kbd>j</kbd>/<kbd>k</kbd> to navigate.
      </div>
      <div class="hotkey-list">
        <div class="hk"><kbd>j</kbd>/<kbd>k</kbd><span>next / prev</span></div>
        <div class="hk"><kbd>↵</kbd><span>open detail</span></div>
        <div class="hk"><kbd>p</kbd><span>create PR</span></div>
        <div class="hk"><kbd>⌘K</kbd><span>command palette</span></div>
        <div class="hk"><kbd>/</kbd><span>focus search</span></div>
        <div class="hk"><kbd>esc</kbd><span>close drawer</span></div>
      </div>
    </div>
  </aside>
{:else}
  {@const pr = r.pr as PrInfo | null}
  <aside class="drawer">
    <div class="drawer-head">
      <div class="drawer-id">
        <span class="id-label">request</span>
        <code class="id-val">{r.id}</code>
      </div>
      <button type="button" class="drawer-close" onclick={onClose} title="close (esc)">✕</button>
    </div>

    <div class="drawer-section">
      <div class="prompt-quote">
        <span class="quote-mark">"</span>{r.prompt || "(empty)"}<span class="quote-mark">"</span>
      </div>
      <div class="drawer-meta-row">
        <span class={`pill pill-${r.status}`}>
          <span class="pill-dot"></span>
          {r.status}
        </span>
        {#if r.endUserEmail}<span class="meta-pill">{r.endUserEmail}</span>{/if}
        {#if r.orgName}<span class="meta-pill">{r.orgName}</span>{/if}
        <span class="meta-pill mono-pill">{relTime(r.createdAt)}</span>
      </div>
    </div>

    {#if r.error}
      <div class="drawer-section error-section">
        <div class="section-label">Error</div>
        <div class="error-box">{r.error}</div>
      </div>
    {/if}

    {#if r.toolCalls && r.toolCalls.length > 0}
      <div class="drawer-section">
        <div class="section-label">Tool calls · {r.toolCalls.length}</div>
        <div class="tool-viz-list">
          {#each r.toolCalls as call, i (i)}
            {@const meta = toolMeta(call.name)}
            {@const target = targetIdFromCall(call)}
            {@const input = (call.input ?? {}) as Record<string, unknown>}
            <div class="tool-viz" style:--c={meta.color}>
              <div class="tool-viz-head">
                <span class="tool-viz-name"><span class="tool-viz-dot"></span>{call.name}</span>
                <span class="tool-viz-arrow">→</span>
                <span class="tool-viz-target">#{target}</span>
              </div>
              {#if call.name === "applyStyle" && input.properties}
                <div class="tool-viz-body">
                  {#each Object.entries(input.properties as Record<string, unknown>) as [k, v] (k)}
                    <div class="style-line">
                      <span class="style-prop">{k}</span>
                      <span class="style-colon">:</span>
                      <span class="style-val">{String(v)}</span>
                      <span class="style-semi">;</span>
                      {#if (k.toLowerCase().includes("color") || k === "background") && isHexColor(String(v))}
                        <span class="style-swatch" style:background={String(v)}></span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else if call.name === "replaceText"}
                <div class="tool-viz-body">
                  <div class="diff-line diff-add">+ "{String(input.text ?? "")}"</div>
                </div>
              {:else if call.name === "hideElement"}
                <div class="tool-viz-body">
                  <div class="diff-line diff-rm">- display</div>
                </div>
              {:else if call.name === "reorderChildren"}
                <div class="tool-viz-body">
                  <div class="reorder-line">
                    {#each (input.order as string[] | undefined) ?? [] as k, i (i)}
                      <span class="reorder-chip">{i + 1}. {k}</span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if r.assistantText}
      <div class="drawer-section">
        <div class="section-label">Assistant</div>
        <div class="assistant-text">{r.assistantText}</div>
      </div>
    {/if}

    {#if pr || inFlight}
      {@const idx =
        pr?.status === "pr_opened"
          ? PHASE_KEYS.length - 1
          : pr?.status === "failed"
            ? -2
            : phaseIndex(pr?.phase ?? null)}
      <div class="drawer-section">
        <div class="section-label">
          PR pipeline
          {#if pr?.status === "running" || inFlight}
            <span class="live-tag"><span class="live-dot"></span>live</span>
          {/if}
        </div>
        <div class="pr-timeline">
          {#each PHASE_KEYS as p, i (p)}
            {@const done = i < idx || pr?.status === "pr_opened"}
            {@const cur = i === idx && (pr?.status === "running" || inFlight)}
            {@const failed = pr?.status === "failed" && i === Math.max(0, phaseIndex(pr?.phase ?? null))}
            <div class="tl-step" class:done class:current={cur} class:failed>
              <div class="tl-dot">
                {#if done}✓{:else if cur}<span class="spinner"></span>{:else if failed}✕{:else}{i + 1}{/if}
              </div>
              <div class="tl-label">{PHASE_SHORT_LABEL[p]}</div>
            </div>
            {#if i < PHASE_KEYS.length - 1}
              <div class="tl-line" class:done></div>
            {/if}
          {/each}
        </div>
        {#if pr?.status === "pr_opened"}
          <div class="pr-summary">
            <div class="pr-summary-head">
              <a class="pr-link" href={pr.url ?? "#"} target="_blank" rel="noreferrer">{pr.repoFullName} #{pr.number}</a
              >
              {#if pr.branch}
                <span class="pr-branch">{pr.branch}</span>
              {/if}
            </div>
            {#if pr.summary}
              <div class="pr-summary-body">{pr.summary}</div>
            {/if}
          </div>
        {/if}
        {#if pr?.status === "failed" && pr.error}
          <div class="error-box" style="margin-top:10px;">{pr.error}</div>
        {/if}
        {#if events.length > 0}
          <div style="margin-top:14px;">
            <PRProgress
              phase={pr?.phase ?? null}
              {events}
              isLive={pr?.status === "running" || inFlight}
              error={pr?.error ?? null}
            />
          </div>
        {/if}
      </div>
    {/if}

    <div class="drawer-section">
      <div class="section-label">Raw event</div>
      <details class="raw-details">
        <summary>show JSON</summary>
        <pre class="code-block"><code
            >{JSON.stringify(
              { id: r.id, status: r.status, prompt: r.prompt, toolCalls: r.toolCalls, pr: r.pr },
              null,
              2,
            )}</code
          ><span class="code-lang">json</span></pre>
      </details>
    </div>

    <div class="drawer-actions">
      <button
        type="button"
        class="btn-action btn-primary-action"
        disabled={inFlight || r.pr?.status === "running"}
        onclick={() =>
          onAction(
            r.pr?.status === "pr_opened" ? "create-pr" : r.pr?.status === "failed" ? "retry-pr" : "create-pr",
            r,
          )}
      >
        {r.pr?.status === "pr_opened" ? "Re-create PR" : r.pr?.status === "failed" ? "Retry PR" : "Create PR"}
        <kbd>p</kbd>
      </button>
      <button type="button" class="btn-action" onclick={() => onAction("copy-id", r)}>Copy id</button>
      <button type="button" class="btn-action btn-danger-action" onclick={() => onAction("delete", r)}>Delete</button>
    </div>
  </aside>
{/if}
