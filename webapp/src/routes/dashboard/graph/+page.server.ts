import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getDb, parseDoc } from "$lib/server/firestore";
import { integrationDocSchema } from "$lib/server/schemas";
import { serializeGithub } from "$lib/server/serialize";
import { buildAndStoreRepoGraph, listRepoGraphs } from "$lib/server/repo-graphs";

export const config = { maxDuration: 300 };

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");

  const integrationSnap = await getDb().collection("integrations").doc(locals.user.uid).get();
  const data = parseDoc(integrationSnap, integrationDocSchema, "integration");
  const github = data?.github?.installationId ? serializeGithub(data.github) : null;

  // Streamed: the repo selector renders from `github` immediately; the graph
  // payload arrives over the wire as the firestore read resolves and is
  // consumed in +page.svelte via {#await data.graphs}.
  return { github, graphs: listRepoGraphs(locals.user.uid) };
};

export const actions: Actions = {
  refresh: async ({ locals, request }) => {
    if (!locals.user) throw redirect(303, "/login");
    const form = await request.formData();
    const repoId = form.get("repoId");
    if (typeof repoId !== "string" || !repoId) return fail(400, { message: "Missing repoId" });
    try {
      await buildAndStoreRepoGraph(locals.user.uid, repoId);
      return { ok: true };
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      const message = (error as Error).message;
      return fail(status, { repoId, message });
    }
  },
};
