import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth-guard";
import { getTenant, upsertTenant, type UpsertPartial } from "$lib/server/tenants";
import { serializeTenant } from "$lib/server/serialize";

function asOptionalString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const orgId = event.params.orgId!;
  const tenant = await getTenant(user.uid, orgId);
  if (!tenant) throw error(404, "No tenant memory yet");
  return json(serializeTenant(tenant));
};

export const PUT: RequestHandler = async (event) => {
  const user = requireUser(event);
  const orgId = event.params.orgId!;
  const body = (await event.request.json()) as Record<string, unknown>;

  const partial: UpsertPartial = {
    orgName: typeof body.orgName === "string" || body.orgName === null ? (body.orgName as string | null) : undefined,
    tenantName: asOptionalString(body.tenantName),
    website: asOptionalString(body.website),
    productDescription: asOptionalString(body.productDescription),
    memory: asOptionalString(body.memory),
  };

  const source =
    body.source === "manual" || body.source === "generated" ? (body.source as "manual" | "generated") : undefined;
  const note = asOptionalString(body.note);

  const tenant = await upsertTenant(user.uid, orgId, partial, {
    authorUid: user.uid,
    note,
    source,
  });
  return json(serializeTenant(tenant));
};
