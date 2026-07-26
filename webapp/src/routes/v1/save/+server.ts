import { error, json, type RequestHandler } from "@sveltejs/kit";
import { verifyRequest } from "$lib/server/sdk-auth";
import { checkAndRecord, RateLimitError, rateLimitResponse } from "$lib/server/rate-limit";
import { getDb, FieldValue } from "$lib/server/firestore";
import type { SnapshotPayload } from "$lib/server/models";

function synthesizeToolCalls(
  overrides: Record<string, unknown>,
  inserted: Record<string, unknown[]>,
  injections: Record<string, unknown[]> = {},
  themeVars: Record<string, string> = {},
  layoutModes: Record<string, unknown> = {},
): Array<Record<string, unknown>> {
  const calls: Array<Record<string, unknown>> = [];
  for (const [targetId, ov] of Object.entries(overrides ?? {})) {
    if (!ov || typeof ov !== "object") continue;
    const o = ov as Record<string, unknown>;
    if (o.style) calls.push({ name: "applyStyle", input: { targetId, properties: o.style } });
    if (o.text !== undefined && o.text !== null) calls.push({ name: "setText", input: { targetId, text: o.text } });
    if ("visible" in o) calls.push({ name: "setVisibility", input: { targetId, visible: o.visible } });
  }
  for (const [containerId, items] of Object.entries(inserted ?? {})) {
    for (const item of items ?? []) {
      if (!item || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      calls.push({
        name: "insertComponent",
        input: {
          containerId,
          componentName: it.componentName,
          props: it.props ?? {},
          position: it.position ?? 0,
        },
      });
    }
  }
  for (const [targetId, items] of Object.entries(injections ?? {})) {
    for (const item of items ?? []) {
      if (!item || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      calls.push({
        name: "injectHTML",
        input: {
          targetId,
          html: it.html ?? "",
          position: it.position ?? "after",
        },
      });
    }
  }
  if (themeVars && Object.keys(themeVars).length > 0) {
    calls.push({ name: "applyTheme", input: { vars: themeVars } });
  }
  for (const [targetId, mode] of Object.entries(layoutModes ?? {})) {
    if (!mode || typeof mode !== "object") continue;
    const m = mode as Record<string, unknown>;
    const callInput: Record<string, unknown> = { targetId, mode: m.mode };
    if (m.columns !== undefined && m.columns !== null) callInput.columns = m.columns;
    calls.push({ name: "setLayout", input: callInput });
  }
  return calls;
}

function summarizeSave(messages: Array<Record<string, unknown>>, toolCalls: Array<Record<string, unknown>>): string {
  for (let i = (messages?.length ?? 0) - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user" && typeof m.content === "string" && m.content.trim()) {
      return m.content.trim();
    }
  }
  if (toolCalls.length) return `Saved ${toolCalls.length} change(s)`;
  return "Saved (no changes)";
}

export const POST: RequestHandler = async ({ request }) => {
  const publishableKey = request.headers.get("x-faraday-key");
  const authorization = request.headers.get("authorization") ?? "";
  const origin = request.headers.get("origin") ?? "";
  if (!publishableKey) throw error(401, "Missing x-faraday-key");

  const userToken = authorization.replace(/^Bearer\s*/i, "").trim();
  const { project, claims } = await verifyRequest(publishableKey, userToken, origin);
  const orgId = (claims.org_id as string | null) ?? (claims.orgId as string | null) ?? null;

  try {
    checkAndRecord(project.projectId, orgId, project.rateLimits);
  } catch (e) {
    if (e instanceof RateLimitError) return rateLimitResponse(e);
    throw e;
  }

  const payload = (await request.json()) as SnapshotPayload;
  const email = (payload.email ?? "").trim().toLowerCase();
  if (!email) throw error(400, "email is required");

  const toolCalls = synthesizeToolCalls(
    payload.overrides ?? {},
    payload.insertedComponents ?? {},
    payload.injections ?? {},
    payload.themeVars ?? {},
    payload.layoutModes ?? {},
  );
  const prompt = summarizeSave(payload.messages ?? [], toolCalls);
  const orgName = (claims.org_name as string | null) ?? (claims.orgName as string | null) ?? null;

  const filteredClaims: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(claims)) {
    if (k !== "exp" && k !== "iat" && k !== "nbf") filteredClaims[k] = v;
  }

  const doc = {
    prompt,
    assistantText: "",
    toolCalls,
    status: toolCalls.length ? "applied" : "responded",
    error: null,
    endUserId: claims.sub,
    endUserEmail: email,
    endUserClaims: filteredClaims,
    orgId,
    orgName,
    origin,
    projectId: project.projectId,
    savedSnapshot: {
      overrides: payload.overrides ?? {},
      insertedComponents: payload.insertedComponents ?? {},
      containerOrder: payload.containerOrder ?? {},
      injections: payload.injections ?? {},
      themeVars: payload.themeVars ?? {},
      layoutModes: payload.layoutModes ?? {},
    },
    pageContext: payload.pageContext ?? null,
    createdAt: FieldValue.serverTimestamp(),
    latencyMs: payload.latencyMs ?? 0,
    firstTokenMs: payload.firstTokenMs ?? 0,
  };
  const ref = await getDb().collection("integrations").doc(project.ownerId).collection("requests").add(doc);

  return json({ id: ref.id, status: doc.status, toolCount: toolCalls.length });
};
