import { error, json, type RequestHandler } from "@sveltejs/kit";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser } from "$lib/server/auth-guard";
import { getDb, parseDoc } from "$lib/server/firestore";
import { integrationDocSchema } from "$lib/server/schemas";
import { serializeGithub } from "$lib/server/serialize";

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const snap = await getDb().collection("integrations").doc(user.uid).get();
  const data = parseDoc(snap, integrationDocSchema, "integration");
  if (!data) throw error(404, "No integration yet");
  const gh = data.github;
  if (!gh || !gh.installationId) throw error(404, "GitHub not installed");
  return json(serializeGithub(gh));
};

export const DELETE: RequestHandler = async (event) => {
  const user = requireUser(event);
  const db = getDb();
  const ref = db.collection("integrations").doc(user.uid);
  const snap = await ref.get();
  const data = parseDoc(snap, integrationDocSchema, "integration");
  const installationId = data?.github?.installationId;

  await ref.update({ github: FieldValue.delete() });
  if (installationId) {
    await db
      .collection("githubInstallations")
      .doc(String(installationId))
      .delete()
      .catch(() => {});
  }
  return json({ status: "cleared", note: "To fully revoke access, uninstall FaradayStack on github.com." });
};
