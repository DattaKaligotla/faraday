import crypto from "node:crypto";
import { error } from "@sveltejs/kit";
import { SESSION_SECRET } from "$env/static/private";
import { child } from "./logger";

const STATE_TTL_SECONDS = 600;
const log = child("state");

let _sessionSecret: Buffer | null = null;
function sessionSecret(): Buffer {
  if (_sessionSecret) return _sessionSecret;
  if (!SESSION_SECRET) {
    log.warn("SESSION_SECRET not set — generating an ephemeral one. In-flight install flows will break on restart.");
    _sessionSecret = Buffer.from(crypto.randomBytes(32));
  } else {
    _sessionSecret = Buffer.from(SESSION_SECRET, "utf-8");
  }
  return _sessionSecret;
}

function b64url(data: Buffer): string {
  return data.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = (4 - (s.length % 4)) % 4;
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad), "base64");
}

export function signState(uid: string): string {
  const payload = {
    uid,
    ts: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto.createHmac("sha256", sessionSecret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export function verifyState(state: string): string {
  const idx = state.indexOf(".");
  if (idx < 0) throw error(400, "Bad state");
  const body = state.slice(0, idx);
  const sig = state.slice(idx + 1);

  const expected = crypto.createHmac("sha256", sessionSecret()).update(body).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw error(400, "Bad state");

  let payload: { uid?: unknown; ts?: unknown };
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf-8"));
  } catch {
    throw error(400, "Bad state");
  }

  const ts = typeof payload.ts === "number" ? payload.ts : 0;
  if (Math.floor(Date.now() / 1000) - ts > STATE_TTL_SECONDS) throw error(400, "State expired");

  const uid = payload.uid;
  if (typeof uid !== "string" || !uid) throw error(400, "Bad state");
  return uid;
}
