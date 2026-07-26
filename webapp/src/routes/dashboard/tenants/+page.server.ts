import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { listOrgIdsFromRequests, listTenants } from "$lib/server/tenants";
import { serializeTenant } from "$lib/server/serialize";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const [tenants, knownOrgIds] = await Promise.all([
    listTenants(locals.user.uid),
    listOrgIdsFromRequests(locals.user.uid),
  ]);
  return {
    tenants: tenants.map(serializeTenant),
    knownOrgIds,
  };
};
