#!/usr/bin/env node
/**
 * Mint a demo JWT for local SDK testing.
 *
 * Pulls the integration's `secretKey` from Firestore and signs a token with the
 * same algorithm/claims the webapp's `verifyUserToken` expects (HS256, sub+exp).
 *
 * Identifies which integration to use, in order of preference:
 *   --key  <publishableKey>     ← match demos/<x>/src/App.tsx publishableKey="..."
 *   --uid  <integrationDocId>
 *   (none) → if exactly one integration exists, use it; else error.
 *
 * Usage:
 *   node webapp/scripts/mint-demo-jwt.mjs                          # autodetect
 *   node webapp/scripts/mint-demo-jwt.mjs --key fdy_pk_xxx
 *   node webapp/scripts/mint-demo-jwt.mjs --key fdy_pk_xxx \
 *     --sub end-user-7 --email me@example.com \
 *     --org-id acme --org-name Acme --ttl-hours 24
 *
 * Env (same as the webapp):
 *   GOOGLE_APPLICATION_CREDENTIALS  path to Firebase service-account JSON
 *   FIREBASE_PROJECT_ID             project id (e.g. faraday-49784)
 *
 * Token is printed to stdout. A copy-paste snippet for the demo is printed to stderr.
 */
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import jwt from "jsonwebtoken";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[k] = v;
  }
  return out;
}

function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.error(
      "Usage: mint-demo-jwt.mjs [--key fdy_pk_...] [--uid <id>]\n" +
        "  [--sub <id>] [--email <e>] [--org-id <id>] [--org-name <n>] [--ttl-hours <n>]",
    );
    process.exit(0);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || fail("FIREBASE_PROJECT_ID is not set");
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || fail("GOOGLE_APPLICATION_CREDENTIALS is not set");

  if (!getApps().length) {
    const sa = JSON.parse(readFileSync(saPath, "utf-8"));
    initializeApp({ credential: cert(sa), projectId });
  }
  const db = getFirestore();

  let docSnap;
  if (args.uid) {
    docSnap = await db.collection("integrations").doc(args.uid).get();
    if (!docSnap.exists) fail(`No integration at integrations/${args.uid}`);
  } else if (args.key) {
    const q = await db.collection("integrations").where("publishableKey", "==", args.key).limit(1).get();
    if (q.empty) fail(`No integration matches publishableKey ${args.key}`);
    docSnap = q.docs[0];
  } else {
    const all = await db.collection("integrations").limit(2).get();
    if (all.empty) fail("No integrations exist in Firestore");
    if (all.size > 1) fail("Multiple integrations exist — pass --key <publishableKey> or --uid <id> to disambiguate");
    docSnap = all.docs[0];
  }

  const data = docSnap.data() ?? {};
  const secretKey = data.secretKey;
  if (!secretKey || typeof secretKey !== "string") fail(`Integration ${docSnap.id} has no secretKey field`);

  const ttlHours = Number(args["ttl-hours"] ?? 24);
  if (!Number.isFinite(ttlHours) || ttlHours <= 0) fail("--ttl-hours must be a positive number");

  const claims = {
    sub: args.sub || "demo-user-1",
    exp: Math.floor(Date.now() / 1000) + ttlHours * 3600,
  };
  if (args.email) claims.email = args.email;
  if (args["org-id"]) claims.org_id = args["org-id"];
  if (args["org-name"]) claims.org_name = args["org-name"];

  const token = jwt.sign(claims, secretKey, { algorithm: "HS256" });

  // Useful context to stderr so stdout stays just the token.
  console.error(
    `\nintegration: integrations/${docSnap.id}` +
      `\npublishableKey: ${data.publishableKey ?? "(missing)"}` +
      `\nclaims: ${JSON.stringify(claims)}` +
      `\nexpires: ${new Date(claims.exp * 1000).toISOString()}\n` +
      `\nDemo snippet:\n  userToken="${token}"\n`,
  );

  console.log(token);
  process.exit(0);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});
