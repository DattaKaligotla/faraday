import type { ProjectConfig } from "./models";

type RateLimits = ProjectConfig["rateLimits"];

const DEFAULT_ORG = "_default";
const MIN_MS = 60 * 1000;
const DAY_MS = 86400 * 1000;

interface Window {
  minute: number[];
  day: number[];
}

const windows = new Map<string, Window>();

export class RateLimitError extends Error {
  status = 429;
  retryAfter: number;
  constructor(message: string, retryAfter: number) {
    super(message);
    this.retryAfter = retryAfter;
  }
}

function trim(win: Window, now: number) {
  while (win.minute.length && now - win.minute[0] > MIN_MS) win.minute.shift();
  while (win.day.length && now - win.day[0] > DAY_MS) win.day.shift();
}

export function checkAndRecord(integrationId: string, orgId: string | null | undefined, limits: RateLimits): void {
  const key = `${integrationId}:${orgId || DEFAULT_ORG}`;
  const now = Date.now();
  let win = windows.get(key);
  if (!win) {
    win = { minute: [], day: [] };
    windows.set(key, win);
  }
  trim(win, now);

  if (win.minute.length >= limits.requestsPerMinute) {
    const retry = Math.max(1, Math.ceil((MIN_MS - (now - win.minute[0])) / 1000));
    throw new RateLimitError(
      `Rate limit exceeded: ${limits.requestsPerMinute}/min for org ${orgId || "default"}`,
      retry,
    );
  }
  if (win.day.length >= limits.requestsPerDay) {
    const retry = Math.max(1, Math.ceil((DAY_MS - (now - win.day[0])) / 1000));
    throw new RateLimitError(`Rate limit exceeded: ${limits.requestsPerDay}/day for org ${orgId || "default"}`, retry);
  }
  win.minute.push(now);
  win.day.push(now);
}

export function rateLimitResponse(err: RateLimitError): Response {
  return new Response(JSON.stringify({ message: err.message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(err.retryAfter),
    },
  });
}
