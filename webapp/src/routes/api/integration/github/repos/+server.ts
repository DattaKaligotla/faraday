import { error, json, type RequestHandler } from "@sveltejs/kit";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser } from "$lib/server/auth-guard";
import { getDb, parseDoc } from "$lib/server/firestore";
import { listInstallationRepos } from "$lib/server/github-api";
import { serializeGithub } from "$lib/server/serialize";
import { integrationDocSchema } from "$lib/server/schemas";
import type { LinkedRepo } from "$lib/server/models";

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const snap = await getDb().collection("integrations").doc(user.uid).get();
  const data = parseDoc(snap, integrationDocSchema, "integration");
  const installationId = data?.github?.installationId;
  if (!installationId) throw error(404, "GitHub not installed");
  return json(await listInstallationRepos(installationId));
};

export const PUT: RequestHandler = async (event) => {
  const user = requireUser(event);
  const body = (await event.request.json()) as {
    repo?: LinkedRepo | null;
    repos?: LinkedRepo[];
  };

  const ref = getDb().collection("integrations").doc(user.uid);
  const snap = await ref.get();
  const data = parseDoc(snap, integrationDocSchema, "integration");
  const github = data?.github;
  if (!github?.installationId) throw error(404, "GitHub not installed");

  const repos: LinkedRepo[] = Array.isArray(body.repos) ? body.repos : body.repo ? [body.repo] : [];

  await ref.set(
    {
      github: {
        linkedRepos: repos,
        linkedRepo: FieldValue.delete(),
      },
    },
    { merge: true },
  );
  return json(serializeGithub({ ...github, linkedRepos: repos, linkedRepo: null }));
};
