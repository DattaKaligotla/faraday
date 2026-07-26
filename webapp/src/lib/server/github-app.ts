import jwt from "jsonwebtoken";
import { error } from "@sveltejs/kit";
import { env as dynamicEnv } from "$env/dynamic/private";
import { child } from "./logger";

const log = child("github-app");
export const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

let _privateKey: string | null = null;

/**
 * Read at runtime via $env/dynamic/private rather than $env/static/private:
 * static values are inlined at build time, and Vercel's build pipeline can
 * mangle multi-line PEMs during the JS string serialization step. Reading
 * from process.env at request time sidesteps that entirely.
 */
function privateKey(): string {
  if (_privateKey) return _privateKey;
  const raw = dynamicEnv.GITHUB_APP_PRIVATE_KEY;
  if (!raw) throw error(500, "GITHUB_APP_PRIVATE_KEY not set");
  const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  if (!pem.includes("-----BEGIN") || !pem.includes("PRIVATE KEY-----")) {
    throw error(500, "GITHUB_APP_PRIVATE_KEY is not a valid PEM");
  }
  _privateKey = pem;
  return _privateKey;
}

function appId(): string {
  const raw = dynamicEnv.GITHUB_APP_ID;
  if (!raw) throw error(500, "GITHUB_APP_ID not set");
  return raw;
}

export function appJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iat: now - 30, exp: now + 9 * 60, iss: appId() }, privateKey(), {
    algorithm: "RS256",
  });
}

interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<number, CachedToken>();
const inFlight = new Map<number, Promise<string>>();

async function mintInstallationToken(installationId: number): Promise<string> {
  const r = await fetch(`${GITHUB_API}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appJwt()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
  if (!r.ok) {
    const text = await r.text();
    log.withMetadata({ status: r.status, body: text }).warn("installation token mint failed");
    throw error(502, "GitHub installation token failed");
  }
  const body = (await r.json()) as { token: string; expires_at: string };
  const expiresAt = Date.parse(body.expires_at) - 60_000;
  tokenCache.set(installationId, { token: body.token, expiresAt });
  return body.token;
}

export async function getInstallationToken(installationId: number): Promise<string> {
  const cached = tokenCache.get(installationId);
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const pending = inFlight.get(installationId);
  if (pending) return pending;
  const p = mintInstallationToken(installationId).finally(() => inFlight.delete(installationId));
  inFlight.set(installationId, p);
  return p;
}

export function evictInstallationToken(installationId: number): void {
  tokenCache.delete(installationId);
}

export async function appFetch(installationId: number, path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const make = async () => {
    const token = await getInstallationToken(installationId);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/vnd.github+json");
    headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(url, { ...init, headers });
  };
  const first = await make();
  if (first.status !== 401) return first;
  evictInstallationToken(installationId);
  return make();
}

export async function appJwtFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${appJwt()}`);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("X-GitHub-Api-Version", GITHUB_API_VERSION);
  return fetch(url, { ...init, headers });
}
