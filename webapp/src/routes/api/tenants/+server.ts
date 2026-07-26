import { json, type RequestHandler } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth-guard";
import { listTenants, listOrgIdsFromRequests } from "$lib/server/tenants";
import { serializeTenant } from "$lib/server/serialize";

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const [tenants, knownOrgIds] = await Promise.all([listTenants(user.uid), listOrgIdsFromRequests(user.uid)]);
  return json({
    tenants: tenants.map(serializeTenant),
    knownOrgIds,
  });
};
