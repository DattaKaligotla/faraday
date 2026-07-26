import { error, json, type RequestHandler } from "@sveltejs/kit";
import crypto from "node:crypto";
import { requireUser } from "$lib/server/auth-guard";
import { getDb, FieldValue, parseDoc } from "$lib/server/firestore";
import { integrationDocSchema } from "$lib/server/schemas";
import { serializeIntegration } from "$lib/server/serialize";

function tokenUrlsafe(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const snap = await getDb().collection("integrations").doc(user.uid).get();
  const data = parseDoc(snap, integrationDocSchema, "integration");
  if (!data) throw error(404, "No integration yet");
  return json(serializeIntegration(data));
};

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const uid = user.uid;
  const email = user.email ?? null;

  const publishableKey = "fdy_pk_" + tokenUrlsafe(24);
  const secretKey = tokenUrlsafe(32);

  const payload = {
    publishableKey,
    secretKey,
    ownerId: uid,
    ownerEmail: email,
    allowedOrigins: [],
    rateLimits: { requestsPerMinute: 10, requestsPerDay: 100 },
    plan: "free",
    createdAt: FieldValue.serverTimestamp(),
  };
  await getDb().collection("integrations").doc(uid).set(payload);

  return json(serializeIntegration({ ...payload, createdAt: null }));
};
