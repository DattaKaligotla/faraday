import crypto from "node:crypto";
import type { Handle } from "@sveltejs/kit";
import { ALLOWED_ORIGINS } from "$env/static/private";
import { child } from "$lib/server/logger";
import { verifySessionCookie } from "$lib/server/firebase-admin";

const SESSION_COOKIE = "__session";

const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function allowedOrigins(): string[] {
  return (ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function isAllowed(origin: string): boolean {
  if (!origin) return false;
  if (LOCALHOST_RE.test(origin)) return true;
  return allowedOrigins().includes(origin);
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/") || pathname.startsWith("/v1/");
}

export const handle: Handle = async ({ event, resolve }) => {
  // Prefer Vercel's per-request id so logs correlate with the request inspector;
  // fall back to a fresh UUID locally and on non-Vercel hosts.
  const requestId = event.request.headers.get("x-vercel-id") || crypto.randomUUID();
  event.locals.requestId = requestId;
  event.locals.log = child("request", { requestId });

  const sessionCookie = event.cookies.get(SESSION_COOKIE);
  if (sessionCookie) {
    try {
      const decoded = await verifySessionCookie(sessionCookie, true);
      event.locals.user = { uid: decoded.uid, email: decoded.email ?? null };
    } catch {
      event.cookies.delete(SESSION_COOKIE, { path: "/" });
      event.locals.user = null;
    }
  } else {
    event.locals.user = null;
  }

  const origin = event.request.headers.get("origin") ?? "";
  const isV1 = event.url.pathname.startsWith("/v1/");

  if (isV1 && event.request.method === "OPTIONS") {
    const headers = new Headers();
    if (isAllowed(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type, x-faraday-key, X-Faraday-Key");
      headers.set("Access-Control-Max-Age", "86400");
    }
    headers.set("x-request-id", requestId);
    return new Response(null, { status: 204, headers });
  }

  const startedAt = Date.now();
  const response = await resolve(event);

  if (isV1 && isAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.append("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set("x-request-id", requestId);

  if (isApiPath(event.url.pathname)) {
    event.locals.log
      .withMetadata({
        method: event.request.method,
        path: event.url.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      })
      .info("request");
  }

  return response;
};
