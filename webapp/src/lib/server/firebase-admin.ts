import { initializeApp, getApps, cert, applicationDefault, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { error } from "@sveltejs/kit";
import { env as dynamicEnv } from "$env/dynamic/private";
import { child } from "./logger";

const log = child("firebase-admin");

/**
 * Resolve a Firebase Admin credential, in order of preference:
 *   1. FIREBASE_SERVICE_ACCOUNT_BASE64  — base64-encoded JSON (recommended for
 *      Vercel / any platform whose env-var UI mangles multi-line PEMs)
 *   2. FIREBASE_SERVICE_ACCOUNT_JSON    — raw JSON string
 *   3. GOOGLE_APPLICATION_CREDENTIALS   — file path (local dev, gcloud ADC)
 *   4. applicationDefault()             — falls back to GCE metadata server etc.
 */
function resolveCredential() {
  const b64 = dynamicEnv.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = Buffer.from(b64, "base64").toString("utf-8");
    return cert(JSON.parse(json) as ServiceAccount);
  }
  const raw = dynamicEnv.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    return cert(JSON.parse(raw) as ServiceAccount);
  }
  const credPath = dynamicEnv.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) return cert(credPath);
  return applicationDefault();
}

export function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: resolveCredential(),
    projectId: dynamicEnv.FIREBASE_PROJECT_ID,
  });
}

export async function verifyIdToken(idToken: string) {
  ensureFirebaseAdmin();
  try {
    return await getAuth().verifyIdToken(idToken);
  } catch (e) {
    log.withError(e).warn("token verification failed");
    throw error(401, "Unauthorized");
  }
}

export async function createSessionCookie(idToken: string, expiresInMs: number) {
  ensureFirebaseAdmin();
  return getAuth().createSessionCookie(idToken, { expiresIn: expiresInMs });
}

export async function verifySessionCookie(sessionCookie: string, checkRevoked = true) {
  ensureFirebaseAdmin();
  return getAuth().verifySessionCookie(sessionCookie, checkRevoked);
}

export async function revokeUserSessions(uid: string) {
  ensureFirebaseAdmin();
  await getAuth().revokeRefreshTokens(uid);
}
