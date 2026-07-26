import { json, type RequestHandler } from "@sveltejs/kit";
import { FieldValue } from "firebase-admin/firestore";
import { getDb, parseDoc } from "$lib/server/firestore";
import { githubInstallationDocSchema } from "$lib/server/schemas";
import { extractFaradayRequestId, verifyAppWebhookSignature } from "$lib/server/webhooks";

interface InstallationPayload {
  action: "created" | "deleted" | "suspend" | "unsuspend" | "new_permissions_accepted";
  installation: { id: number };
}

interface PullRequestPayload {
  action: "opened" | "closed" | "reopened" | "edited" | "synchronize" | string;
  pull_request: {
    merged: boolean;
    body: string | null;
  };
  installation: { id: number };
}

async function uidForInstallation(installationId: number): Promise<string | null> {
  const snap = await getDb().collection("githubInstallations").doc(String(installationId)).get();
  const data = parseDoc(snap, githubInstallationDocSchema, "githubInstallation");
  return data?.uid ?? null;
}

async function handleInstallation(payload: InstallationPayload): Promise<void> {
  const installationId = payload.installation.id;
  if (payload.action === "deleted" || payload.action === "suspend") {
    const uid = await uidForInstallation(installationId);
    const db = getDb();
    if (uid) {
      await db
        .collection("integrations")
        .doc(uid)
        .update({ "github.installationId": FieldValue.delete() })
        .catch(() => {});
    }
    await db
      .collection("githubInstallations")
      .doc(String(installationId))
      .delete()
      .catch(() => {});
  }
}

/**
 * Stamp `pr.mergedAt` on the matching request doc when a Faraday-authored PR
 * gets merged. Correlation key is the `Faraday-Request-Id:` trailer the agent
 * runner writes into every PR body (`agent-runner/src/pr.ts`). PRs not
 * authored by Faraday have no such trailer and are silently ignored.
 *
 * We promote `pr.status` from `"pr_opened"` → `"pr_merged"` inside a
 * transaction so we don't clobber a `"failed"` doc that happens to share a
 * request-id (extremely unlikely but cheap to guard against). For any other
 * existing status, just stamp `pr.mergedAt` and leave status alone.
 */
async function handlePullRequest(payload: PullRequestPayload): Promise<void> {
  if (payload.action !== "closed" || !payload.pull_request.merged) return;
  const requestId = extractFaradayRequestId(payload.pull_request.body);
  if (!requestId) return;
  const uid = await uidForInstallation(payload.installation.id);
  if (!uid) return;

  const ref = getDb().collection("integrations").doc(uid).collection("requests").doc(requestId);
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = (snap.data()?.pr ?? null) as { status?: string } | null;
    const promote = current?.status === "pr_opened";
    tx.set(
      ref,
      {
        pr: {
          mergedAt: FieldValue.serverTimestamp(),
          ...(promote ? { status: "pr_merged" } : {}),
        },
      },
      { merge: true },
    );
  });
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const log = locals.log.withContext({ component: "github-webhook" });
  const rawBody = await request.text();
  const sig = request.headers.get("x-hub-signature-256");
  if (!verifyAppWebhookSignature(rawBody, sig)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const eventName = request.headers.get("x-github-event") ?? "";
  if (eventName === "ping") return json({ ok: true });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    if (eventName === "installation") {
      await handleInstallation(payload as InstallationPayload);
    } else if (eventName === "pull_request") {
      await handlePullRequest(payload as PullRequestPayload);
    }
  } catch (e) {
    log.withMetadata({ eventName }).withError(e).warn("handler error");
  }

  return json({ ok: true });
};
