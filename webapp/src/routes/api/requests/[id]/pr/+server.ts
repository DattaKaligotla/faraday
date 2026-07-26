import crypto from "node:crypto";
import { error, type RequestHandler } from "@sveltejs/kit";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser } from "$lib/server/auth-guard";
import { getDb, parseDoc } from "$lib/server/firestore";
import { getInstallationToken } from "$lib/server/github-app";
import { child } from "$lib/server/logger";
import { integrationDocSchema, requestRecordSchema } from "$lib/server/schemas";
import { resolveSnapshotKey } from "$lib/server/snapshot-cache";
import { dispatchJob } from "$lib/server/sandbox-dispatch";
import { getTenant } from "$lib/server/tenants";
import { sseResponse } from "$lib/server/sse";
import type { JobEvent, JobInput } from "$runner/types";

export const config = { maxDuration: 300 };

// Liveness window for an in-flight job. The agent-runner mirror touches
// `pr.lastEventAt` on every event emitted (`agent-runner/src/sandbox-entry.ts`),
// so a healthy run keeps the doc fresh. Anything older than this is treated
// as abandoned and a new dispatch is allowed; the long-tail cleanup is done
// separately by the cron reaper at `api/cron/reap-stale-jobs`.
const ACTIVE_JOB_GRACE_MS = 90 * 1000;

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const requestId = event.params.id!;
  const reqLog = event.locals.log.withContext({
    component: "pr-dispatch",
    uid: user.uid,
    targetRequestId: requestId,
  });
  const log = (msg: string, extra?: Record<string, unknown>) =>
    extra ? reqLog.withMetadata(extra).info(msg) : reqLog.info(msg);
  const logErr = (msg: string, extra?: unknown) =>
    extra !== undefined ? reqLog.withError(extra).error(msg) : reqLog.error(msg);

  log("POST received");

  const db = getDb();
  const integrationRef = db.collection("integrations").doc(user.uid);
  const integrationSnap = await integrationRef.get();
  const integration = parseDoc(integrationSnap, integrationDocSchema, "integration");
  const linked = integration?.github?.linkedRepo ?? integration?.github?.linkedRepos?.[0] ?? null;
  const installationId = integration?.github?.installationId;
  if (!installationId || !linked) {
    log("rejecting: github not configured", { installationId, linked });
    throw error(409, "GitHub App is not installed or no repo is linked");
  }

  const requestRef = integrationRef.collection("requests").doc(requestId);
  const requestSnap = await requestRef.get();
  const requestData = parseDoc(requestSnap, requestRecordSchema, "request");
  if (!requestData) {
    log("rejecting: request not found");
    throw error(404, "Request not found");
  }

  const jobId = crypto.randomUUID();
  const defaultBranch = linked.defaultBranch ?? "main";
  log("dispatching", { jobId, repo: linked.fullName, defaultBranch, installationId });

  // Atomic transition: only one job in flight per request, and never re-run
  // on top of a finished PR. We reject if:
  //   - status === 'pr_opened' (PR already exists; user must delete the
  //     request to retry — overwriting would clobber pr.url/number/branch)
  //   - status === 'running' AND lastEventAt is within ACTIVE_JOB_GRACE_MS
  //     (job is still emitting events). lastEventAt is the liveness signal,
  //     not startedAt — a slow Bedrock turn can take longer than the old
  //     5-minute startedAt-based window.
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(requestRef);
      const existing = (snap.data()?.pr ?? null) as {
        status?: string;
        lastEventAt?: { toMillis?: () => number };
      } | null;
      if (existing?.status === "pr_opened") {
        throw error(409, "PR already opened for this request; delete and re-create to retry");
      }
      if (existing?.status === "running") {
        const lastEventMs = existing.lastEventAt?.toMillis?.() ?? 0;
        const ageMs = lastEventMs ? Date.now() - lastEventMs : Infinity;
        if (ageMs < ACTIVE_JOB_GRACE_MS) {
          throw error(409, "PR job already running");
        }
      }
      tx.set(
        requestRef,
        {
          pr: {
            jobId,
            status: "running",
            phase: "preparing",
            repoFullName: linked.fullName,
            startedAt: FieldValue.serverTimestamp(),
            // Seed lastEventAt now so the next-dispatch precondition has a
            // fresh liveness signal during the ~7s sandbox boot before the
            // runner emits its first event.
            lastEventAt: FieldValue.serverTimestamp(),
            openedAt: null,
            url: null,
            number: null,
            branch: null,
            summary: null,
            error: null,
          },
        },
        { merge: true },
      );
    });
  } catch (e) {
    const code = (e as { status?: number }).status;
    if (code === 409) log("rejecting: pr already running");
    else logErr("running-flag transaction failed", e);
    throw e;
  }

  let githubToken: string;
  try {
    githubToken = await getInstallationToken(installationId);
    log("installation token minted", { length: githubToken.length });
  } catch (e) {
    const msg = (e as Error).message;
    logErr("installation token failed", e);
    await markFailed(requestRef, jobId, `installation token failed: ${msg}`);
    throw error(502, "GitHub installation token failed");
  }

  const snapshot = await resolveSnapshotKey({
    installationId,
    owner: linked.owner,
    repo: linked.name,
    defaultBranch,
  }).catch((e) => {
    logErr("snapshot lookup failed (non-fatal)", e);
    return null;
  });
  log("snapshot resolution", { hit: !!snapshot, key: snapshot?.key ?? null });

  const orgId = requestData.orgId ?? null;
  const tenant = orgId ? await getTenant(user.uid, orgId).catch(() => null) : null;
  if (tenant?.memory) {
    log("loaded tenant memory", { orgId, bytes: tenant.memory.length });
  }

  const jobInput: JobInput = {
    uid: user.uid,
    requestId,
    jobId,
    repoFullName: linked.fullName,
    owner: linked.owner,
    repo: linked.name,
    defaultBranch,
    snapshotKey: snapshot?.key,
    prompt: requestData.prompt ?? "",
    pageContext: (requestData.pageContext ?? null) as Record<string, unknown> | null,
    messages: (requestData.messages ?? []) as Array<{ role?: string; content?: unknown }>,
    savedSnapshot: requestData.savedSnapshot,
    toolCalls: requestData.toolCalls,
    orgId,
    orgName: requestData.orgName ?? tenant?.orgName ?? null,
    tenantMemory: tenant?.memory,
  };

  let dispatchIter: AsyncGenerator<JobEvent, void, void>;
  try {
    dispatchIter = dispatchJob({ jobInput, githubToken });
    log("dispatch handed off to sandbox", { jobId });
  } catch (e) {
    logErr("synchronous dispatch failure", e);
    await markFailed(requestRef, jobId, `dispatch failed: ${(e as Error).message}`);
    throw error(503, "Sandbox dispatch failed");
  }

  return sseResponse(teeTerminalToFirestore(dispatchIter, requestRef, jobId));
};

/**
 * Pass every event through to the SSE consumer, but additionally mirror terminal
 * events to the parent doc's `pr` field. The agent-runner has its own Firestore
 * mirror that writes the same fields, but it only runs when
 * FARADAY_FIREBASE_SA_BASE64 is set in the sandbox env. This tee is the
 * authoritative path for the parent doc — the runner mirror is layered on top
 * to additionally populate the per-event subcollection used for timeline replay.
 *
 * If iteration itself throws (sandbox crash, network drop), we mark the parent
 * doc failed so the request doesn't get stuck in a permanent "running" state.
 *
 * Writes use `merge: true`, so when both sides are active they're idempotent:
 * the runner sets `phase: "done"` on `pr:opened` and we set the same here.
 */
async function* teeTerminalToFirestore(
  iter: AsyncGenerator<JobEvent, void, void>,
  ref: FirebaseFirestore.DocumentReference,
  jobId: string,
): AsyncGenerator<JobEvent, void, void> {
  const log = child("pr-dispatch", { jobId });
  const safeSet = (data: Record<string, unknown>) =>
    ref.set(data, { merge: true }).catch((e) => log.withError(e).warn("tee terminal mirror write failed"));

  try {
    for await (const ev of iter) {
      yield ev;
      if (ev.type === "pr:opened") {
        await safeSet({
          pr: {
            status: "pr_opened",
            phase: "done",
            url: ev.url,
            number: ev.number,
            branch: ev.branch,
            summary: ev.summary,
            openedAt: FieldValue.serverTimestamp(),
            lastEventAt: FieldValue.serverTimestamp(),
            error: null,
          },
        });
      } else if (ev.type === "pr:no_changes") {
        await safeSet({
          pr: {
            status: "failed",
            phase: "done",
            error: "Agent produced no edits.",
            summary: ev.summary,
            lastEventAt: FieldValue.serverTimestamp(),
          },
        });
      } else if (ev.type === "failed") {
        await safeSet({
          pr: {
            status: "failed",
            phase: "failed",
            error: ev.error,
            lastEventAt: FieldValue.serverTimestamp(),
          },
        });
      }
    }
  } catch (e) {
    await markFailed(ref, jobId, `dispatch stream failed: ${(e as Error).message}`);
    throw e;
  }
}

async function markFailed(ref: FirebaseFirestore.DocumentReference, jobId: string, msg: string): Promise<void> {
  const log = child("pr-dispatch", { jobId });
  log.withMetadata({ reason: msg }).error("markFailed");
  await ref
    .set({ pr: { status: "failed", error: msg } }, { merge: true })
    .catch((e) => log.withError(e).warn("markFailed write error"));
}
