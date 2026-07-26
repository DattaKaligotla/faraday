import { json, type RequestHandler } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth-guard";
import { listTenantVersions } from "$lib/server/tenants";
import { serializeTenantVersion } from "$lib/server/serialize";

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const orgId = event.params.orgId!;
  const versions = await listTenantVersions(user.uid, orgId);
  return json({ versions: versions.map(serializeTenantVersion) });
};
