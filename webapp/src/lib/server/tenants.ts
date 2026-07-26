import { getDb, FieldValue, parseDoc } from "./firestore";
import {
  tenantDocSchema,
  tenantVersionDocSchema,
  type TenantDoc,
  type TenantVersionDoc,
  type TenantSource,
} from "./schemas";

function tenantsCol(uid: string) {
  return getDb().collection("integrations").doc(uid).collection("tenants");
}

function versionsCol(uid: string, orgId: string) {
  return tenantsCol(uid).doc(orgId).collection("versions");
}

export async function getTenant(uid: string, orgId: string): Promise<TenantDoc | null> {
  const snap = await tenantsCol(uid).doc(orgId).get();
  return parseDoc(snap, tenantDocSchema, "tenant");
}

export async function listTenants(uid: string): Promise<TenantDoc[]> {
  const snap = await tenantsCol(uid).get();
  const out: TenantDoc[] = [];
  for (const doc of snap.docs) {
    const data = parseDoc(doc, tenantDocSchema, "tenant");
    if (data) out.push(data);
  }
  return out;
}

export async function listTenantVersions(
  uid: string,
  orgId: string,
): Promise<Array<TenantVersionDoc & { id: string }>> {
  const snap = await versionsCol(uid, orgId).orderBy("createdAt", "desc").get();
  const out: Array<TenantVersionDoc & { id: string }> = [];
  for (const doc of snap.docs) {
    const data = parseDoc(doc, tenantVersionDocSchema, "tenantVersion");
    if (data) out.push({ ...data, id: doc.id });
  }
  return out;
}

export async function getTenantVersion(
  uid: string,
  orgId: string,
  versionId: string,
): Promise<(TenantVersionDoc & { id: string }) | null> {
  const snap = await versionsCol(uid, orgId).doc(versionId).get();
  const data = parseDoc(snap, tenantVersionDocSchema, "tenantVersion");
  return data ? { ...data, id: snap.id } : null;
}

export interface UpsertOptions {
  authorUid: string;
  note?: string;
  /** Override `source` for the new doc/version. Defaults to existing or "manual". */
  source?: TenantSource;
}

export interface UpsertPartial {
  orgName?: string | null;
  tenantName?: string;
  website?: string;
  productDescription?: string;
  memory?: string;
}

/**
 * Merge `partial` into `tenants/{orgId}`. If `partial.memory` differs from the
 * current memory (or there is no current doc), append a new `versions/{autoId}`
 * snapshot in the same transaction and update `currentVersionId` on the parent.
 */
export async function upsertTenant(
  uid: string,
  orgId: string,
  partial: UpsertPartial,
  opts: UpsertOptions,
): Promise<TenantDoc> {
  const db = getDb();
  const docRef = tenantsCol(uid).doc(orgId);
  const versionsRef = versionsCol(uid, orgId);

  const written = await db.runTransaction(async (tx) => {
    const existingSnap = await tx.get(docRef);
    const existing = parseDoc(existingSnap, tenantDocSchema, "tenant");

    const isNew = !existing;
    const memoryChanged = partial.memory !== undefined && partial.memory !== (existing?.memory ?? "");
    const source = opts.source ?? existing?.source ?? "manual";

    let newVersionId: string | null = null;
    if (memoryChanged) {
      const newVersionRef = versionsRef.doc();
      newVersionId = newVersionRef.id;
      const versionData: Omit<TenantVersionDoc, "createdAt"> & { createdAt: FirebaseFirestore.FieldValue } = {
        memory: partial.memory ?? "",
        source,
        authorUid: opts.authorUid,
        ...(opts.note ? { note: opts.note } : {}),
        createdAt: FieldValue.serverTimestamp(),
      };
      tx.create(newVersionRef, versionData);
    }

    const next: Record<string, unknown> = {
      orgId,
      ...(partial.orgName !== undefined ? { orgName: partial.orgName } : {}),
      ...(partial.tenantName !== undefined ? { tenantName: partial.tenantName } : {}),
      ...(partial.website !== undefined ? { website: partial.website } : {}),
      ...(partial.productDescription !== undefined ? { productDescription: partial.productDescription } : {}),
      ...(partial.memory !== undefined ? { memory: partial.memory } : {}),
      source,
      updatedAt: FieldValue.serverTimestamp(),
      ...(isNew ? { createdAt: FieldValue.serverTimestamp() } : {}),
      ...(newVersionId ? { currentVersionId: newVersionId } : {}),
      ...(memoryChanged && source === "generated" ? { generatedAt: FieldValue.serverTimestamp() } : {}),
    };

    tx.set(docRef, next, { merge: true });

    return { isNew };
  });

  const finalSnap = await docRef.get();
  const final = parseDoc(finalSnap, tenantDocSchema, "tenant");
  if (!final) {
    throw new Error(`upsertTenant: post-write read failed for ${uid}/${orgId} (isNew=${written.isNew})`);
  }
  return final;
}

export interface KnownOrg {
  orgId: string;
  orgName: string | null;
  lastSeenAt: string | null; // ISO
  requestCount: number;
}

/**
 * Group end-user requests under `integrations/{uid}/requests` by orgId so the
 * dashboard can present a picker of orgs the SDK has actually surfaced. Caps
 * the scan at the most recent 500 requests — high-traffic customers will still
 * see their active orgs and can pre-seed any rare ones manually.
 */
export async function listOrgIdsFromRequests(uid: string): Promise<KnownOrg[]> {
  const snap = await getDb()
    .collection("integrations")
    .doc(uid)
    .collection("requests")
    .orderBy("createdAt", "desc")
    .limit(500)
    .select("orgId", "orgName", "createdAt")
    .get();

  const map = new Map<string, KnownOrg>();
  for (const doc of snap.docs) {
    const data = doc.data() as { orgId?: string | null; orgName?: string | null; createdAt?: { toDate?: () => Date } };
    const orgId = data.orgId ?? null;
    if (!orgId) continue;
    const seenIso = data.createdAt?.toDate?.()?.toISOString() ?? null;
    const prev = map.get(orgId);
    if (!prev) {
      map.set(orgId, { orgId, orgName: data.orgName ?? null, lastSeenAt: seenIso, requestCount: 1 });
    } else {
      prev.requestCount += 1;
      if (!prev.orgName && data.orgName) prev.orgName = data.orgName;
    }
  }
  return [...map.values()];
}
