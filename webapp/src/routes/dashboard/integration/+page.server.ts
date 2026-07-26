import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getDb, parseDoc } from "$lib/server/firestore";
import { integrationDocSchema } from "$lib/server/schemas";
import { serializeGithub, serializeIntegration } from "$lib/server/serialize";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const snap = await getDb().collection("integrations").doc(locals.user.uid).get();
  const data = parseDoc(snap, integrationDocSchema, "integration");
  return {
    integration: data ? serializeIntegration(data) : null,
    github: data?.github?.installationId ? serializeGithub(data.github) : null,
  };
};
