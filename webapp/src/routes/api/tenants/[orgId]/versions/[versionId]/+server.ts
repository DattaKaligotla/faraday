import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth-guard";
import { getTenantVersion } from "$lib/server/tenants";
import { serializeTenantVersion } from "$lib/server/serialize";

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const orgId = event.params.orgId!;
  const versionId = event.params.versionId!;
  const version = await getTenantVersion(user.uid, orgId, versionId);
  if (!version) throw error(404, "Version not found");
  return json(serializeTenantVersion(version));
};
