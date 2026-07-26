#!/usr/bin/env node
/**
 * Seed a fake end-user request into Firestore so the dashboard's "Create PR"
 * flow can be exercised end-to-end without driving the SDK.
 *
 * The shape mirrors what `routes/v1/save/+server.ts` writes when a real user
 * saves a session — same fields, same Firestore path. The new doc shows up at
 * the top of the dashboard's request list and "Create PR" works against it.
 *
 * Usage:
 *   node webapp/scripts/seed-fake-request.mjs --prompt "Make the heading red"
 *   node webapp/scripts/seed-fake-request.mjs --preset inbox-empty-state
 *   node webapp/scripts/seed-fake-request.mjs --preset inbox-empty-state \
 *     --uid <integrationId> --status applied
 *
 * Args:
 *   --uid         integration doc id (default: the only integration in Firestore)
 *   --preset      one of the named presets (see PRESETS below)
 *   --prompt      freeform prompt; required if --preset is omitted
 *   --page-url    page where the user made the request
 *   --origin      origin header value
 *   --user-id     end-user id (sub claim)
 *   --user-email  end-user email
 *   --org-id, --org-name
 *   --target      target id for the synthesized toolCall (default: derived)
 *   --tool        applyStyle (default) | insertComponent
 *   --assistant   assistant text shown on the request
 *   --status      applied (default) | responded | failed
 *
 * Env (same as mint-demo-jwt.mjs):
 *   GOOGLE_APPLICATION_CREDENTIALS  path to Firebase service-account JSON
 *   FIREBASE_PROJECT_ID             project id (default: faraday-49784)
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

const PRESETS = {
  "inbox-empty-state": {
    prompt:
      "On the inbox page, the empty state message is too plain. Can you make it friendlier — maybe an icon and a one-line tip about forwarding receipts?",
    pageUrl: "https://app.midday.ai/inbox",
    origin: "https://app.midday.ai",
    userId: "mark@northwind.example",
    userEmail: "mark@northwind.example",
    orgId: "northwind",
    orgName: "Northwind Traders",
    claims: { role: "owner", plan: "team" },
    target: "inbox-empty-state",
    tool: "applyStyle",
    assistant:
      "I can update the inbox empty-state to add an icon and a short tip about email-forwarding so it feels more welcoming.",
  },
  "pricing-cta-color": {
    prompt: "The 'Get started' button on pricing is too quiet. Make it pop — maybe a bolder color.",
    pageUrl: "https://acme.example/pricing",
    origin: "https://acme.example",
    userId: "lara@acme.example",
    userEmail: "lara@acme.example",
    orgId: "acme",
    orgName: "Acme Inc",
    claims: { role: "admin", plan: "growth" },
    target: "pricing-cta",
    tool: "applyStyle",
    assistant: "I can make the 'Get started' button stand out by switching it to a stronger brand color.",
  },
  "settings-header-copy": {
    prompt: "Settings header just says 'Settings'. Add a one-line description below it explaining what's on the page.",
    pageUrl: "https://app.lattice.example/settings",
    origin: "https://app.lattice.example",
    userId: "ops-7",
    userEmail: "ops@lattice.example",
    orgId: "lattice",
    orgName: "Lattice",
    claims: { role: "owner", plan: "team" },
    target: "settings-header",
    tool: "applyStyle",
    assistant: "I can add a short subtitle under the Settings heading describing what the page covers.",
  },
};

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

function buildDoc({
  prompt,
  assistantText,
  pageUrl,
  origin,
  userId,
  userEmail,
  orgId,
  orgName,
  claims,
  target,
  tool,
  status,
}) {
  const toolCall = {
    name: tool,
    input:
      tool === "insertComponent"
        ? { containerId: target, componentName: "FaradayCard", props: { title: "Welcome" } }
        : { targetId: target, properties: { color: "#dc2626", "font-weight": "600" } },
  };

  const modifiable = {
    id: target,
    source: { fileName: `src/components/${kebabToPascal(target)}.tsx`, lineNumber: 12 },
    domSnippet: `<div data-faraday-id="${target}">…</div>`,
  };

  return {
    prompt,
    assistantText: assistantText ?? "",
    toolCalls: [toolCall],
    status,
    error: null,
    endUserId: userId,
    endUserEmail: userEmail,
    endUserClaims: claims,
    orgId,
    orgName,
    origin,
    projectId: "fake",
    savedSnapshot: {
      overrides: tool === "applyStyle" ? { [target]: { style: { color: "#dc2626", "font-weight": "600" } } } : {},
      insertedComponents:
        tool === "insertComponent"
          ? { [target]: [{ id: `instance_${Math.random().toString(36).slice(2, 8)}`, ...toolCall.input }] }
          : {},
      containerOrder: {},
      injections: {},
      themeVars: {},
      layoutModes: {},
    },
    pageContext: { url: pageUrl, modifiables: [modifiable] },
    createdAt: FieldValue.serverTimestamp(),
  };
}

function kebabToPascal(s) {
  return s
    .split(/[-_]/g)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
}

async function resolveUid(db, uidArg) {
  if (uidArg) {
    const ref = db.collection("integrations").doc(uidArg);
    const snap = await ref.get();
    if (!snap.exists) fail(`No integration at integrations/${uidArg}`);
    return uidArg;
  }
  const all = await db.collection("integrations").limit(2).get();
  if (all.empty) fail("No integrations exist in Firestore");
  if (all.size > 1) fail("Multiple integrations exist — pass --uid <id> to pick one");
  return all.docs[0].id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.error(
      readFileSync(new URL(import.meta.url), "utf-8")
        .split("\n")
        .slice(1, 36)
        .join("\n"),
    );
    console.error(`\npresets: ${Object.keys(PRESETS).join(", ")}`);
    process.exit(0);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "faraday-49784";
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || fail("GOOGLE_APPLICATION_CREDENTIALS is not set");

  if (!getApps().length) {
    const sa = JSON.parse(readFileSync(saPath, "utf-8"));
    initializeApp({ credential: cert(sa), projectId });
  }
  const db = getFirestore();

  const preset = args.preset ? PRESETS[args.preset] : null;
  if (args.preset && !preset) fail(`unknown preset '${args.preset}'. known: ${Object.keys(PRESETS).join(", ")}`);

  const prompt = args.prompt ?? preset?.prompt;
  if (!prompt) fail("--prompt or --preset is required");

  const target = args.target ?? preset?.target ?? "demo-target";
  const tool = args.tool ?? preset?.tool ?? "applyStyle";
  const status = args.status ?? "applied";
  const pageUrl = args["page-url"] ?? preset?.pageUrl ?? "https://example.test/";
  const origin = args.origin ?? preset?.origin ?? new URL(pageUrl).origin;
  const userId = args["user-id"] ?? preset?.userId ?? "demo-user-1";
  const userEmail = args["user-email"] ?? preset?.userEmail ?? null;
  const orgId = args["org-id"] ?? preset?.orgId ?? null;
  const orgName = args["org-name"] ?? preset?.orgName ?? null;
  const assistantText = args.assistant ?? preset?.assistant ?? "";
  const claims = preset?.claims ?? { role: "owner", plan: "team" };

  const uid = await resolveUid(db, args.uid);
  const doc = buildDoc({
    prompt,
    assistantText,
    pageUrl,
    origin,
    userId,
    userEmail,
    orgId,
    orgName,
    claims,
    target,
    tool,
    status,
  });

  const ref = await db.collection("integrations").doc(uid).collection("requests").add(doc);

  console.error(
    `seeded request:\n` +
      `  path:     integrations/${uid}/requests/${ref.id}\n` +
      `  prompt:   ${prompt}\n` +
      `  status:   ${status}\n` +
      `  org:      ${orgName ?? "—"}\n` +
      `  page:     ${pageUrl}\n` +
      `  target:   ${target} (${tool})\n` +
      `\nopen the dashboard at /dashboard/requests and click "Create PR".\n`,
  );
  console.log(ref.id);
  process.exit(0);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  process.exit(1);
});
