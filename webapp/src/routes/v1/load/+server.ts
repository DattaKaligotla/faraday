import { error, json, type RequestHandler } from "@sveltejs/kit";
import { verifyRequest } from "$lib/server/sdk-auth";
import { getDb, parseDoc } from "$lib/server/firestore";
import { requestRecordSchema } from "$lib/server/schemas";

export const GET: RequestHandler = async ({ request }) => {
  const publishableKey = request.headers.get("x-faraday-key");
  const authorization = request.headers.get("authorization") ?? "";
  const origin = request.headers.get("origin") ?? "";
  if (!publishableKey) throw error(401, "Missing x-faraday-key");

  const userToken = authorization.replace(/^Bearer\s*/i, "").trim();
  const { project, claims } = await verifyRequest(publishableKey, userToken, origin);

  const endUserId = claims.sub;
  const snap = await getDb()
    .collection("integrations")
    .doc(project.ownerId)
    .collection("requests")
    .where("endUserId", "==", endUserId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return json({ overrides: {}, insertedComponents: {} });

  const data = parseDoc(snap.docs[0], requestRecordSchema, "request");
  const saved = data?.savedSnapshot ?? {};
  return json({
    overrides: saved.overrides ?? {},
    insertedComponents: saved.insertedComponents ?? {},
  });
};
