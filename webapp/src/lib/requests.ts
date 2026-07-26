import { parseDoc } from "$lib/server/firestore";
import { requestRecordSchema } from "$lib/server/schemas";
import { tsToIso } from "$lib/server/serialize";
import type { Firestore } from "@google-cloud/firestore";

/**
 * Lists the most recent end-user requests for the authenticated dashboard
 * user, newest first. Reads from `integrations/{uid}/requests`, parses each
 * doc against `requestRecordSchema`, and returns a JSON array shaped for the
 * dashboard UI (Firestore Timestamps converted to ISO strings, optional fields
 * coerced to `null`). The `limit` query param caps the page size at 200
 * (default 50).
 */
export const listRequests = async (user_uid: string, db: Firestore, limit: number = 50) => {
  const snap = await db
    .collection("integrations")
    .doc(user_uid)
    .collection("requests")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const items = snap.docs
    .map((doc) => {
      const data = parseDoc(doc, requestRecordSchema, "request");
      if (!data) return null;
      const pr = data.pr
        ? {
            jobId: data.pr.jobId,
            status: data.pr.status,
            phase: data.pr.phase ?? null,
            repoFullName: data.pr.repoFullName,
            branch: data.pr.branch ?? null,
            url: data.pr.url ?? null,
            number: data.pr.number ?? null,
            summary: data.pr.summary ?? null,
            error: data.pr.error ?? null,
            startedAt: tsToIso(data.pr.startedAt),
            openedAt: tsToIso(data.pr.openedAt),
            mergedAt: tsToIso(data.pr.mergedAt),
            closedAt: tsToIso(data.pr.closedAt),
            lastEventAt: tsToIso(data.pr.lastEventAt),
          }
        : null;
      return {
        id: doc.id,
        prompt: data.prompt ?? "",
        assistantText: data.assistantText ?? "",
        toolCalls: data.toolCalls ?? [],
        status: data.status ?? "responded",
        error: data.error ?? null,
        endUserId: data.endUserId ?? null,
        endUserEmail: data.endUserEmail ?? null,
        endUserClaims: data.endUserClaims ?? null,
        orgId: data.orgId ?? null,
        orgName: data.orgName ?? null,
        origin: data.origin ?? "",
        pageContext: data.pageContext ?? null,
        createdAt: tsToIso(data.createdAt),
        pr,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return items;
};
