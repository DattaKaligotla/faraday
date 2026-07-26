import { error, json, type RequestHandler } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";
import { requireUser } from "$lib/server/auth-guard";
import { signState } from "$lib/server/state";

export const POST: RequestHandler = async (event) => {
  const user = requireUser(event);
  const slug = env.GITHUB_APP_SLUG;
  if (!slug) throw error(500, "GITHUB_APP_SLUG not set");
  const state = signState(user.uid);
  const installUrl = `https://github.com/apps/${encodeURIComponent(slug)}/installations/new?state=${encodeURIComponent(state)}`;
  return json({ installUrl });
};
