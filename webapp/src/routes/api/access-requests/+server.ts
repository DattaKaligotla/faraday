import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import { FieldValue, getDb } from "$lib/server/firestore";
import { RateLimitError, checkAndRecord } from "$lib/server/rate-limit";

const bodySchema = z.object({
  email: z.string().trim().email().max(200),
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().min(1).max(100),
  role: z.string().trim().max(60).optional().default(""),
  useCase: z.string().trim().max(2000).optional().default(""),
  // Honeypot — bots tend to fill any field they see, real users never do.
  website: z.string().optional(),
});

export const POST: RequestHandler = async (event) => {
  let raw: unknown;
  try {
    raw = await event.request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Invalid form data" }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot: if the hidden field has any value, silently accept and drop.
  // Returning 200 keeps bots from learning we filter them.
  if (data.website && data.website.trim().length > 0) {
    return json({ ok: true });
  }

  const ip = event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || event.getClientAddress();

  try {
    checkAndRecord("access-requests", ip, {
      requestsPerMinute: 5,
      requestsPerDay: 50,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(err.retryAfter) } },
      );
    }
    throw err;
  }

  await getDb()
    .collection("accessRequests")
    .add({
      email: data.email,
      name: data.name,
      company: data.company,
      role: data.role,
      useCase: data.useCase,
      ip,
      userAgent: event.request.headers.get("user-agent") ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

  return json({ ok: true });
};
