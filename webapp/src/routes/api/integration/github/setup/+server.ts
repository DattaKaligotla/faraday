import { redirect, type RequestHandler } from "@sveltejs/kit";
import { FieldValue } from "firebase-admin/firestore";
import { FRONTEND_URL } from "$env/static/private";
import { getDb, parseDoc } from "$lib/server/firestore";
import { integrationDocSchema } from "$lib/server/schemas";
import { verifyState } from "$lib/server/state";
import { getInstallation } from "$lib/server/github-api";

export const GET: RequestHandler = async ({ url }) => {
  const frontend = (FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const base = `${frontend}/dashboard/integration`;
  const back = (qs: string) => redirect(303, `${base}?${qs}`);

  const installationIdRaw = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");
  const state = url.searchParams.get("state");

  if (setupAction === "request") {
    throw back("github=request_pending");
  }
  if (!installationIdRaw) throw back("github=error&reason=missing_installation_id");

  const installationId = Number(installationIdRaw);
  if (!Number.isFinite(installationId) || installationId <= 0) {
    throw back("github=error&reason=bad_installation_id");
  }

  let uid: string;
  let install: { account: { id: number; login: string; type: "User" | "Organization" } };
  try {
    if (!state) throw new Error("missing_state");
    uid = verifyState(state);
    install = await getInstallation(installationId);
  } catch (e) {
    const msg =
      (e as { body?: { message?: string }; message?: string }).body?.message ?? (e as Error).message ?? "setup_failed";
    throw back(`github=error&reason=${encodeURIComponent(msg)}`);
  }

  const db = getDb();
  const integrationRef = db.collection("integrations").doc(uid);
  const snap = await integrationRef.get();
  const existing = parseDoc(snap, integrationDocSchema, "integration");
  const linked = existing?.github?.linkedRepos ?? [];

  await integrationRef.set(
    {
      github: {
        installationId,
        account: install.account,
        linkedRepos: linked,
        installedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true },
  );

  await db.collection("githubInstallations").doc(String(installationId)).set({
    uid,
    accountLogin: install.account.login,
    createdAt: FieldValue.serverTimestamp(),
  });

  throw back("github=installed");
};
