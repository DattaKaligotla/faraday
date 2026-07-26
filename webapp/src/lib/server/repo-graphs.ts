/**
 * Single source of truth for everything the dashboard does with per-repo
 * component graphs. Both the page loader (`/dashboard/graph/+page.server.ts`)
 * and the page's `refresh` form action delegate to functions in this module —
 * no Firestore queries or build logic is open-coded in either surface.
 */
import { error } from "@sveltejs/kit";
import { FieldValue, getDb, parseDoc } from "./firestore";
import { integrationDocSchema, repoGraphRecordSchema } from "./schemas";
import { serializeRepoGraph, type SerializedRepoGraph } from "./serialize";
import { fetchRepoTarball, getBranchHead } from "./github-api";
import { buildComponentGraph, type GraphResult } from "./component-graph";
import { child } from "./logger";

const log = child("repo-graphs");

const ACTIVE_BUILD_GRACE_MS = 60 * 1000;

function reposCol(uid: string) {
  return getDb().collection("integrations").doc(uid).collection("repos");
}

export async function getRepoGraph(uid: string, repoId: string): Promise<SerializedRepoGraph | null> {
  const snap = await reposCol(uid).doc(repoId).get();
  const parsed = parseDoc(snap, repoGraphRecordSchema, "repoGraph");
  return parsed ? serializeRepoGraph(parsed) : null;
}

export async function listRepoGraphs(uid: string): Promise<Record<string, SerializedRepoGraph>> {
  const snap = await reposCol(uid).get();
  const out: Record<string, SerializedRepoGraph> = {};
  for (const doc of snap.docs) {
    const parsed = parseDoc(doc, repoGraphRecordSchema, "repoGraph");
    if (parsed) out[doc.id] = serializeRepoGraph(parsed);
  }
  return out;
}

/**
 * Fetch the customer repo's tarball, parse it into a component graph, and
 * write the result to Firestore. Used by the dashboard's `refresh` form
 * action; throws SvelteKit `error()` for the action to surface.
 */
export async function buildAndStoreRepoGraph(uid: string, repoId: string): Promise<SerializedRepoGraph> {
  if (!/^\d+$/.test(repoId)) throw error(400, "repoId must be a numeric GitHub repo id");

  const integrationRef = getDb().collection("integrations").doc(uid);
  const integrationSnap = await integrationRef.get();
  const integration = parseDoc(integrationSnap, integrationDocSchema, "integration");
  const installationId = integration?.github?.installationId;
  const linkedRepos =
    integration?.github?.linkedRepos ?? (integration?.github?.linkedRepo ? [integration.github.linkedRepo] : []);
  const repo = linkedRepos.find((r) => String(r.id) === repoId) ?? null;
  if (!installationId || !repo) throw error(404, "Repo not tracked by this workspace");

  const repoRef = reposCol(uid).doc(repoId);

  // Atomic precondition: only one in-flight build per repo. `lastEventAt` is
  // the liveness signal; if the previous run died without writing terminal
  // state, the next attempt sails through after `ACTIVE_BUILD_GRACE_MS`.
  await getDb().runTransaction(async (tx) => {
    const snap = await tx.get(repoRef);
    const existing = (snap.data() ?? null) as { status?: string; lastEventAt?: { toMillis?: () => number } } | null;
    if (existing?.status === "building") {
      const lastMs = existing.lastEventAt?.toMillis?.() ?? 0;
      const ageMs = lastMs ? Date.now() - lastMs : Infinity;
      if (ageMs < ACTIVE_BUILD_GRACE_MS) throw error(409, "Graph build already in progress");
    }
    tx.set(
      repoRef,
      {
        repoFullName: repo.fullName,
        status: "building",
        error: null,
        startedAt: FieldValue.serverTimestamp(),
        lastEventAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const defaultBranch = repo.defaultBranch ?? "main";
  log.withMetadata({ uid, repoId, fullName: repo.fullName, defaultBranch }).info("graph build start");

  try {
    const graphRef = await getBranchHead(installationId, repo.owner, repo.name, defaultBranch);
    const tarball = await fetchRepoTarball(installationId, repo.owner, repo.name, graphRef);

    const gen = buildComponentGraph(tarball);
    let result: GraphResult | null = null;
    while (true) {
      const next = await gen.next();
      if (next.done) {
        result = next.value;
        break;
      }
      // Heartbeat liveness; we don't surface per-file events to the dashboard
      // because the form-action shape doesn't stream — Firestore is the only
      // source of truth.
      void repoRef
        .set({ lastEventAt: FieldValue.serverTimestamp() }, { merge: true })
        .catch((heartbeatError) => log.withError(heartbeatError).warn("liveness heartbeat failed"));
    }
    if (!result) throw new Error("graph builder returned no result");

    await repoRef.set(
      {
        status: "idle",
        error: null,
        graphRef,
        generatedAt: FieldValue.serverTimestamp(),
        lastEventAt: FieldValue.serverTimestamp(),
        graph: result.graph,
      },
      { merge: true },
    );

    const stored = await getRepoGraph(uid, repoId);
    if (!stored) throw new Error("failed to read back stored graph");
    log
      .withMetadata({
        uid,
        repoId,
        components: stored.graph?.components.length ?? 0,
        edges: stored.graph?.edges.length ?? 0,
        graphRef,
      })
      .info("graph build done");
    return stored;
  } catch (buildError) {
    const message = (buildError as Error).message;
    log.withError(buildError).withMetadata({ uid, repoId }).error("graph build failed");
    await repoRef
      .set({ status: "failed", error: message, lastEventAt: FieldValue.serverTimestamp() }, { merge: true })
      .catch((mirrorError) => log.withError(mirrorError).warn("failed-state mirror write failed"));
    throw buildError;
  }
}
