import { error, json, type RequestHandler } from "@sveltejs/kit";
import { Timestamp } from "firebase-admin/firestore";
import { env as dynamicEnv } from "$env/dynamic/private";
import { getDb } from "$lib/server/firestore";

const STALE_AFTER_MS = 30 * 60 * 1000;
// Grace period: a job that has emitted an event recently is still alive even if
// it has been "running" for longer than STALE_AFTER_MS overall (e.g. a slow agent run).
const IDLE_AFTER_MS = 10 * 60 * 1000;

function authorized(event: Parameters<RequestHandler>[0]): boolean {
  const secret = dynamicEnv.CRON_SECRET;
  if (!secret) return true; // local dev: allow
  const auth = event.request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export const GET: RequestHandler = async (event) => {
  if (!authorized(event)) throw error(401, "unauthorized");

  const db = getDb();
  const now = Date.now();
  const startedCutoff = Timestamp.fromMillis(now - STALE_AFTER_MS);
  const idleCutoff = Timestamp.fromMillis(now - IDLE_AFTER_MS);
  const snap = await db
    .collectionGroup("requests")
    .where("pr.status", "==", "running")
    .where("pr.startedAt", "<", startedCutoff)
    .limit(100)
    .get();

  const toReap = snap.docs.filter((d) => {
    // Spare jobs that have emitted an event within IDLE_AFTER_MS — they're slow but alive.
    const last = d.get("pr.lastEventAt") as { toMillis?: () => number } | undefined;
    if (last && typeof last.toMillis === "function") {
      return last.toMillis() < idleCutoff.toMillis();
    }
    return true;
  });

  const updates = toReap.map((d) =>
    d.ref.set(
      {
        pr: {
          status: "failed",
          phase: "failed",
          error: "stale: no progress events within 10 minutes",
        },
      },
      { merge: true },
    ),
  );
  await Promise.all(updates);

  return json({ scanned: snap.size, reaped: toReap.length });
};
