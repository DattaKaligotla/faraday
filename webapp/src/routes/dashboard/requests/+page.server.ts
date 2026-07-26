import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { listRequests } from "$lib/requests";
import { requireUser } from "$lib/server/auth-guard";
import { getDb, parseDoc } from "$lib/server/firestore";
import { integrationDocSchema, requestRecordSchema } from "$lib/server/schemas";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const db = getDb();
  const [requests, integrationSnap] = await Promise.all([
    listRequests(locals.user.uid, db),
    db.collection("integrations").doc(locals.user.uid).get(),
  ]);
  const integration = parseDoc(integrationSnap, integrationDocSchema, "integration");
  const linked = integration?.github?.linkedRepo ?? integration?.github?.linkedRepos?.[0] ?? null;
  return { requests, linkedRepo: linked?.fullName ?? null };
};

export const actions: Actions = {
  delete: async (event) => {
    const user = requireUser(event);
    const form = await event.request.formData();
    const id = String(form.get("id") ?? "");
    if (!id) return fail(400, { message: "Missing id" });
    const ref = getDb().collection("integrations").doc(user.uid).collection("requests").doc(id);
    const snap = await ref.get();
    const data = parseDoc(snap, requestRecordSchema, "request");
    if (!data) throw error(404, "Request not found");
    await ref.delete();
    return { ok: true, id };
  },
};
