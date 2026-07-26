#!/usr/bin/env node
/**
 * Bulk-seed realistic fake requests + (if missing) a mocked integration doc
 * for an analytics demo. Writes ~`--count` request docs into
 * `integrations/{uid}/requests` with realistic distributions across status,
 * orgs, users, tools, prompts, latency, PR funnel state, and a working-hour-
 * biased createdAt spread across the last 14 days (split ~55/45 between the
 * trailing 7d and the prior 7d so the volume chart's "compare to prior"
 * overlay has data).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json \
 *     node webapp/scripts/seed-bulk-demo.mjs --email jack@terac.ai \
 *       [--count 850] [--repo terac/monorepo] [--dry-run]
 *
 * If the target user has no integration doc, the script creates one with a
 * mocked publishable/secret key pair and a faked github.linkedRepo. The
 * PR-dispatch flow won't actually work without a real GitHub App install,
 * but the dashboard renders fully.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

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

function randomKey(prefix) {
  return `${prefix}_${randomBytes(18).toString("hex")}`;
}

// ─── deterministic RNG ─────────────────────────────────────────────────────

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function weightedPick(entries, rng) {
  const total = entries.reduce((a, e) => a + e.weight, 0);
  let roll = rng() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1].value;
}

// Box-Muller normal → log-normal latency. Adjust mu/sigma at call-site.
function logNormal(rng, mu, sigma) {
  let u = 0;
  while (u === 0) u = rng();
  let v = 0;
  while (v === 0) v = rng();
  const n = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.exp(mu + sigma * n);
}

// ─── demo data ─────────────────────────────────────────────────────────────

// `weight` controls how often each org wins the per-doc lottery. Terac (the
// integration owner, dogfooding from inside) is weighted ~4× any customer.
// `recency7d` is the share of that org's docs that land in the last 7 days
// (the rest fall in 7–14d). Terac skews recent because the team's been
// hammering the app this week to get ready for the demo.
const ORGS = [
  { id: "org_terac", name: "Terac", origin: "https://app.terac.ai", weight: 12, recency7d: 0.85 },
  { id: "org_viking", name: "Viking", origin: "https://portal.vikinggroup.com", weight: 3, recency7d: 0.55 },
  { id: "org_clarkdietrich", name: "Clark Dietrich", origin: "https://portal.clarkdietrich.com", weight: 3, recency7d: 0.55 },
  { id: "org_neuco", name: "Neuco", origin: "https://orders.neuco.com", weight: 3, recency7d: 0.55 },
  { id: "org_atkore", name: "Atkore", origin: "https://portal.atkore.com", weight: 3, recency7d: 0.55 },
  { id: "org_mcnichols", name: "McNICHOLS", origin: "https://store.mcnichols.com", weight: 3, recency7d: 0.55 },
  { id: "org_allied", name: "Allied Tube", origin: "https://portal.alliedtube.com", weight: 3, recency7d: 0.55 },
];

const USERS_BY_ORG = {
  org_terac: ["jack@terac.ai", "rachel@terac.ai", "morgan@terac.ai"],
  org_viking: ["mark.s@vikinggroup.com", "lisa.t@vikinggroup.com", "ops@vikinggroup.com"],
  org_clarkdietrich: ["dave.r@clarkdietrich.com", "kate.m@clarkdietrich.com"],
  org_neuco: ["rob.a@neuco.com", "ana.f@neuco.com", "sales@neuco.com"],
  org_atkore: ["sean.k@atkore.com", "priya@atkore.com"],
  org_mcnichols: ["bill.h@mcnichols.com", "sue.p@mcnichols.com"],
  org_allied: ["jen.w@alliedtube.com", "paul.d@alliedtube.com"],
};

// Weighted prompts. Higher weight = appears more often, which feeds the
// "Recurring prompts" panel. A few are flagged `complex` so they trigger
// the PR funnel.
const PROMPTS = [
  { p: "Hide the priority column for our workspace", w: 14, target: "table-priority-col", tool: "applyStyle" },
  { p: "Make the headline bigger and bolder", w: 11, target: "hero-headline", tool: "applyStyle" },
  {
    p: "Rename 'Account Exec' to 'AE' everywhere on the dashboard",
    w: 9,
    target: "label-account-exec",
    tool: "replaceText",
  },
  { p: "Change CTA button text to 'Start free trial'", w: 8, target: "btn-primary", tool: "replaceText" },
  { p: "Hide the 'Beta' badge on the reports page", w: 7, target: "badge-beta", tool: "setVisibility" },
  { p: "Reorder the pipeline columns: lost should come last", w: 6, target: "pipeline-board", tool: "reorderChildren" },
  { p: "Make the sidebar narrower", w: 5, target: "app-sidebar", tool: "applyStyle" },
  { p: "Make the demo banner less aggressive — softer color", w: 5, target: "demo-banner", tool: "applyStyle" },
  { p: "Bigger font on the activity feed timestamps", w: 4, target: "feed-time", tool: "applyStyle" },
  {
    p: "Change pricing card subtitle to 'per seat / month, billed annually'",
    w: 4,
    target: "pricing-pro-sub",
    tool: "replaceText",
  },
  { p: "Turn the dashboard greeting red because it's wrong", w: 3, target: "dashboard-greeting", tool: "applyStyle" },
  { p: "Show user avatar next to comments", w: 3, target: "comment-author", tool: "applyStyle" },
  { p: "Add a closed-lost filter on the deals page", w: 6, target: "deals-filters", tool: "applyStyle", complex: true },
  { p: "Add a 'Snooze' button to each alert card", w: 5, target: "alert-card", tool: "applyStyle", complex: true },
  {
    p: "Add CSV export button to the activity feed",
    w: 4,
    target: "activity-toolbar",
    tool: "applyStyle",
    complex: true,
  },
  {
    p: "The settings nav link should be hidden for non-admins",
    w: 4,
    target: "nav-settings",
    tool: "applyStyle",
    complex: true,
  },
  {
    p: "The dashboard greeting should use AE name not first name",
    w: 3,
    target: "dashboard-greeting",
    tool: "applyStyle",
    complex: true,
  },
  { p: "Move the search bar to the top of the page", w: 3, target: "global-search", tool: "applyStyle", complex: true },
];

const FAILURE_REASONS = [
  "tool 'applyStyle' rejected: targetId not found in page snapshot",
  "rate limit exceeded for integration (60/min)",
  "anthropic: stream interrupted (502)",
  "css property 'position: fixed' is not in the allowlist",
  "tool 'replaceText' rejected: target is not a text node",
  "agent: max iterations exceeded",
];

// ─── time distribution ─────────────────────────────────────────────────────

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Sample a createdAt in [now-14d, now] with three biases stacked:
 *   1) recency — `recency7d` of the org's docs in last 7d, rest in 7–14d.
 *      Per-org so Terac can skew recent while customers spread evenly.
 *   2) working-hour bias — UTC 13:00–22:00 (~PT business) gets ~3× weight.
 *   3) weekday bias — Mon–Fri ~2× weekend.
 */
function sampleCreatedAt(rng, nowMs, recency7d = 0.55) {
  const recencyRoll = rng();
  let agoMs;
  if (recencyRoll < recency7d) agoMs = rng() * 7 * DAY_MS;
  else agoMs = (7 + rng() * 7) * DAY_MS;

  let candidate = nowMs - agoMs;
  for (let attempt = 0; attempt < 10; attempt++) {
    const d = new Date(candidate);
    const hour = d.getUTCHours();
    const day = d.getUTCDay();
    const hourWeight = hour >= 13 && hour <= 22 ? 1.0 : 0.35;
    const weekdayWeight = day >= 1 && day <= 5 ? 1.0 : 0.45;
    if (rng() < hourWeight * weekdayWeight) return candidate;
    const startOfDay = d.setUTCHours(0, 0, 0, 0);
    candidate = startOfDay + Math.floor(rng() * DAY_MS);
  }
  return candidate;
}

// ─── doc builder ───────────────────────────────────────────────────────────

function synthesizeToolCalls(prompt, rng) {
  const calls = [
    { name: prompt.tool, input: { targetId: prompt.target, properties: { color: "#dc2626", fontSize: "16px" } } },
  ];
  if (rng() < 0.25) {
    const extra = pick(["setVisibility", "applyTheme", "reorderChildren"], rng);
    if (extra === "setVisibility")
      calls.push({ name: "setVisibility", input: { targetId: prompt.target, visible: false } });
    else if (extra === "applyTheme") calls.push({ name: "applyTheme", input: { vars: { "--brand": "#f97316" } } });
    else calls.push({ name: "reorderChildren", input: { containerId: prompt.target, order: ["a", "b"] } });
  }
  if (prompt.complex) {
    for (let i = 0; i < 4 + Math.floor(rng() * 4); i++) {
      calls.push({ name: "applyStyle", input: { targetId: `${prompt.target}-${i}`, properties: { padding: "8px" } } });
    }
  }
  return calls;
}

function buildPr({ prompt, repo, createdAtMs, rng }) {
  if (!prompt.complex) return null;
  if (rng() >= 0.7) return null; // only ~70% of complex prompts produce PR work

  const startedAtMs = createdAtMs + 1000 + Math.floor(rng() * 60_000);
  const branch = `faraday/${randomBytes(4).toString("hex")}-${randomBytes(4).toString("hex")}`;
  const prNumber = 9000 + Math.floor(rng() * 999);

  // All PRs in the seed are successful — every doc lands at pr_opened or
  // pr_merged. No failed PRs, no in-flight (running) PRs.
  const openedAtMs = startedAtMs + 60_000 + Math.floor(rng() * 5 * 60_000);
  const merged = rng() < 0.55;
  if (merged) {
    const mergedAtMs = openedAtMs + Math.floor(rng() * 5 * DAY_MS);
    return {
      jobId: `job_${randomBytes(5).toString("hex")}`,
      status: "pr_merged",
      phase: "done",
      repoFullName: repo,
      branch,
      url: `https://github.com/${repo}/pull/${prNumber}`,
      number: prNumber,
      summary: `Adds ${prompt.target} — generated by FaradayStack agent.`,
      error: null,
      startedAt: Timestamp.fromMillis(startedAtMs),
      openedAt: Timestamp.fromMillis(openedAtMs),
      mergedAt: Timestamp.fromMillis(mergedAtMs),
      lastEventAt: Timestamp.fromMillis(mergedAtMs),
    };
  }
  return {
    jobId: `job_${randomBytes(5).toString("hex")}`,
    status: "pr_opened",
    phase: "done",
    repoFullName: repo,
    branch,
    url: `https://github.com/${repo}/pull/${prNumber}`,
    number: prNumber,
    summary: `Adds ${prompt.target} — generated by FaradayStack agent.`,
    error: null,
    startedAt: Timestamp.fromMillis(startedAtMs),
    openedAt: Timestamp.fromMillis(openedAtMs),
    lastEventAt: Timestamp.fromMillis(openedAtMs),
  };
}

function buildDoc(rng, nowMs, repo) {
  const org = weightedPick(ORGS.map((entry) => ({ value: entry, weight: entry.weight })), rng);
  const userEmail = pick(USERS_BY_ORG[org.id], rng);
  const userId = userEmail.split("@")[0];
  const prompt = weightedPick(
    PROMPTS.map((p) => ({ value: p, weight: p.w })),
    rng,
  );

  // Status distribution applies uniformly across complex + simple prompts —
  // the funnel keys on the `pr` field, not on status, so complex prompts can
  // still be "applied" (agent shipped some client-side change) while also
  // having a PR record for the deeper backend work. No `failed` outcomes in
  // the seed — every request resolves as applied or responded.
  const status = rng() < 0.94 ? "applied" : "responded";

  const createdAtMs = sampleCreatedAt(rng, nowMs, org.recency7d);
  const toolCalls = status === "applied" ? synthesizeToolCalls(prompt, rng) : [];

  // Log-normal latency: mu=ln(1800), sigma=0.65 → p50 ~1.8s, p95 ~5s, p99 ~9s
  // with occasional outliers above the SLO line.
  const latencyMs = Math.max(300, Math.min(60_000, Math.round(logNormal(rng, Math.log(1800), 0.65))));
  const firstTokenMs = Math.round(latencyMs * (0.2 + rng() * 0.4));

  const error = status === "failed" ? pick(FAILURE_REASONS, rng) : null;
  const pr = buildPr({ prompt, repo, createdAtMs, rng });

  return {
    prompt: prompt.p,
    assistantText:
      status === "applied"
        ? `Done — ${toolCalls.length} change(s) applied.`
        : status === "responded"
          ? "I can describe how to do this, but it requires code changes. Want me to open a PR?"
          : "",
    toolCalls,
    status,
    error,
    endUserId: userId,
    endUserEmail: userEmail,
    endUserClaims: { role: "owner", plan: "team", org_id: org.id, sub: userId },
    orgId: org.id,
    orgName: org.name,
    origin: org.origin,
    projectId: "demo-seed",
    savedSnapshot: {
      overrides: {},
      insertedComponents: {},
      containerOrder: {},
      injections: {},
      themeVars: {},
      layoutModes: {},
    },
    pageContext: {
      url: `${org.origin}/dashboard`,
      modifiables: [
        {
          id: prompt.target,
          source: {
            fileName: `src/components/${prompt.target.split("-")[0]}.tsx`,
            lineNumber: 40 + Math.floor(rng() * 60),
          },
        },
      ],
    },
    createdAt: Timestamp.fromMillis(createdAtMs),
    latencyMs,
    firstTokenMs,
    // Omit `pr` entirely when there's no PR work — `requestRecordSchema`
    // declares the field as `prInfoSchema.optional()`, which accepts
    // undefined but rejects null (real /v1/save docs don't write the
    // field at all for non-PR requests, matching that contract).
    ...(pr ? { pr } : {}),
  };
}

// ─── integration provisioning ──────────────────────────────────────────────

function buildIntegration({ uid, email, repoFullName }) {
  const [owner, name] = repoFullName.split("/");
  if (!owner || !name) fail(`--repo must be in owner/name form, got "${repoFullName}"`);
  return {
    publishableKey: randomKey("pk_test"),
    secretKey: randomKey("sk_test"),
    ownerId: uid,
    ownerEmail: email,
    allowedOrigins: [`https://${owner}.com`, `https://app.${owner}.com`, `https://${owner}.ai`],
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 5000 },
    plan: "team",
    createdAt: FieldValue.serverTimestamp(),
    github: {
      // Fake installation id — the PR-dispatch path won't actually work,
      // but the dashboard renders the integration as connected.
      installationId: 999_999_999,
      account: { id: 99_999_999, login: owner, type: "Organization" },
      linkedRepo: {
        id: 88_888_888,
        owner,
        name,
        fullName: repoFullName,
        private: true,
        defaultBranch: "main",
        pushedAt: new Date().toISOString(),
      },
      linkedRepos: [
        {
          id: 88_888_888,
          owner,
          name,
          fullName: repoFullName,
          private: true,
          defaultBranch: "main",
          pushedAt: new Date().toISOString(),
        },
      ],
      installedAt: FieldValue.serverTimestamp(),
    },
  };
}

// ─── orchestration ─────────────────────────────────────────────────────────

async function resolveUid(db, auth, { uid, email }) {
  if (uid) return uid;
  if (!email) fail("--email <addr> or --uid <id> is required");
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) fail(`No Firebase Auth user for ${email}`);
  return user.uid;
}

/**
 * Delete every request doc this script has previously written for the
 * tenant. We identify ours via `projectId === "demo-seed"`, the marker the
 * builder stamps on each doc — that way any real user-saved docs (which
 * carry the tenant's actual `projectId`) survive the wipe.
 */
async function clearSeedDocs(db, uid, dryRun) {
  const requestsRef = db.collection("integrations").doc(uid).collection("requests");
  const snap = await requestsRef.where("projectId", "==", "demo-seed").get();
  if (snap.empty) {
    console.error(`clear: no seeded docs found in integrations/${uid}/requests`);
    return 0;
  }
  console.error(`clear: ${snap.size} seeded docs found in integrations/${uid}/requests`);
  if (dryRun) return snap.size;

  let deleted = 0;
  const BATCH_SIZE = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + BATCH_SIZE)) batch.delete(doc.ref);
    await batch.commit();
    deleted += Math.min(BATCH_SIZE, snap.docs.length - i);
    console.error(`  clear batch — ${deleted}/${snap.size}`);
  }
  return deleted;
}

async function ensureIntegration(db, uid, { email, repoFullName, dryRun }) {
  const ref = db.collection("integrations").doc(uid);
  const snap = await ref.get();
  if (snap.exists) {
    console.error(`integration: integrations/${uid} (exists)`);
    return { created: false, repo: snap.data()?.github?.linkedRepo?.fullName ?? repoFullName };
  }
  console.error(`integration: integrations/${uid} (missing — will create)`);
  if (dryRun) return { created: false, repo: repoFullName };
  const doc = buildIntegration({ uid, email, repoFullName });
  await ref.set(doc);
  console.error(`  created: publishableKey=${doc.publishableKey.slice(0, 18)}… repo=${repoFullName}`);
  return { created: true, repo: repoFullName };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.error(
      readFileSync(new URL(import.meta.url), "utf-8")
        .split("\n")
        .slice(1, 19)
        .join("\n"),
    );
    process.exit(0);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || "faraday-49784";
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || fail("GOOGLE_APPLICATION_CREDENTIALS is not set");

  if (!getApps().length) {
    const sa = JSON.parse(readFileSync(saPath, "utf-8"));
    initializeApp({ credential: cert(sa), projectId });
  }
  const db = getFirestore();
  const auth = getAuth();

  const email = args.email === "true" ? null : args.email;
  const uidArg = args.uid === "true" ? null : args.uid;
  const count = Number(args.count ?? 400);
  const seed = Number(args.seed ?? 1337);
  const repoFullName = (args.repo === "true" ? null : args.repo) ?? "terac/monorepo";
  const dryRun = args["dry-run"] === "true" || args["dry-run"] === true;
  const clear = args.clear === "true" || args.clear === true;

  const uid = await resolveUid(db, auth, { uid: uidArg, email });
  const { repo } = await ensureIntegration(db, uid, { email, repoFullName, dryRun });

  if (clear) {
    const removed = await clearSeedDocs(db, uid, dryRun);
    console.error(`  cleared: ${removed} prior seeded docs\n`);
  }

  console.error(`plan:`);
  console.error(`  target: integrations/${uid}`);
  console.error(`  repo:   ${repo}`);
  console.error(`  count:  ${count}`);
  console.error(`  seed:   ${seed}`);
  console.error(`  mode:   ${dryRun ? "DRY RUN (no writes)" : "WRITE"}`);

  const rng = makeRng(seed);
  const nowMs = Date.now();
  const docs = Array.from({ length: count }, () => buildDoc(rng, nowMs, repo));

  const byStatus = { applied: 0, responded: 0, failed: 0 };
  const byOrg = {};
  let withPr = 0;
  let merged = 0;
  for (const doc of docs) {
    byStatus[doc.status] = (byStatus[doc.status] ?? 0) + 1;
    byOrg[doc.orgName] = (byOrg[doc.orgName] ?? 0) + 1;
    if (doc.pr) withPr++;
    if (doc.pr?.status === "pr_merged") merged++;
  }
  console.error(`\nplanned distribution:`);
  console.error(`  status: ${JSON.stringify(byStatus)}`);
  console.error(`  orgs:   ${JSON.stringify(byOrg)}`);
  console.error(`  with PR: ${withPr} (merged: ${merged})`);

  if (dryRun) {
    console.error(`\n(dry run — no writes performed)`);
    process.exit(0);
  }

  const requestsRef = db.collection("integrations").doc(uid).collection("requests");
  let written = 0;
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + BATCH_SIZE)) {
      batch.set(requestsRef.doc(), doc);
    }
    await batch.commit();
    written += Math.min(BATCH_SIZE, docs.length - i);
    console.error(`  batch committed — ${written}/${docs.length}`);
  }
  console.error(`\ndone — ${written} docs written to integrations/${uid}/requests`);
}

main().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
