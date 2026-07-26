import crypto from "node:crypto";
import { env } from "$env/dynamic/private";
import { child } from "./logger";

const log = child("webhooks");
const FARADAY_REQUEST_ID_RE = /^Faraday-Request-Id:\s*([\w-]+)\s*$/m;

export function extractFaradayRequestId(body: string | null | undefined): string | null {
  if (!body) return null;
  const m = body.match(FARADAY_REQUEST_ID_RE);
  return m ? m[1] : null;
}

export function verifyAppWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    log.warn("GITHUB_WEBHOOK_SECRET not set — rejecting all webhooks");
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const provided = signatureHeader.slice("sha256=".length);
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(provided, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
