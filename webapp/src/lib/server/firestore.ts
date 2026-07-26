import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { z } from "zod";
import { ensureFirebaseAdmin } from "./firebase-admin";
import { child } from "./logger";

const log = child("firestore");

export function getDb() {
  ensureFirebaseAdmin();
  return getFirestore();
}

export { FieldValue };

export function parseDoc<T extends z.ZodTypeAny>(
  snap: FirebaseFirestore.DocumentSnapshot,
  schema: T,
  label: string,
): z.infer<T> | null {
  if (!snap.exists) return null;
  const result = schema.safeParse(snap.data());
  if (!result.success) {
    log.withMetadata({ label, path: snap.ref.path, issues: result.error.issues }).error("schema validation failed");
    return null;
  }
  return result.data;
}
