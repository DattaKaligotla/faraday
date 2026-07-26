import { error, type RequestHandler } from "@sveltejs/kit";
import { verifyRequest } from "$lib/server/sdk-auth";
import { checkAndRecord, RateLimitError, rateLimitResponse } from "$lib/server/rate-limit";
import { streamAgent } from "$lib/server/anthropic";
import { getTenant } from "$lib/server/tenants";
import type { AgentRequest } from "$lib/server/models";

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

  const body = (await request.json()) as AgentRequest;

  // Append per-org "tenant memory" to the system prompt so the in-page agent's
  // suggestions reflect the tenant's context (industry, terminology, scale). The
  // memory file never ships to the browser — it only reaches the model.
  if (orgId) {
    const tenant = await getTenant(project.projectId, orgId).catch(() => null);
    if (tenant?.memory) {
      const label = tenant.orgName || tenant.tenantName || orgId;
      body.system = `${body.system ?? ""}\n\nTENANT CONTEXT (memory file maintained by the customer for tenant "${label}"):\n${tenant.memory}`;
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of streamAgent(body)) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
};
