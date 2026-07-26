import { error, type RequestHandler } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth-guard";
import { streamTenantMemoryAgent, type AnthropicMessage } from "$lib/server/tenantMemoryAgent";

export const config = { maxDuration: 300 };

export const POST: RequestHandler = async (event) => {
  requireUser(event);
  const body = (await event.request.json()) as { messages?: unknown };
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw error(400, "messages must be a non-empty array");
  }
  const messages = body.messages as AnthropicMessage[];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamTenantMemoryAgent({ messages })) {
          controller.enqueue(chunk);
        }
      } finally {
        controller.close();
      }
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
