import { error } from "@sveltejs/kit";
import { appFetch, appJwtFetch } from "./github-app";
import { child } from "./logger";
import type { LinkedRepo } from "./models";

const log = child("github-api");

async function readError(r: Response, label: string): Promise<never> {
  let text = "";
  try {
    text = await r.text();
  } catch {
    /* ignore */
  }
  log.withMetadata({ label, status: r.status, body: text }).warn("github call failed");
  throw error(502, `GitHub ${label} failed (${r.status})`);
}

export interface GithubInstallationAccount {
  id: number;
  login: string;
  type: "User" | "Organization";
}

export async function getInstallation(
  installationId: number,
): Promise<{ id: number; account: GithubInstallationAccount }> {
  const r = await appJwtFetch(`/app/installations/${installationId}`);
  if (!r.ok) return readError(r, "getInstallation");
  const body = (await r.json()) as {
    id: number;
    account: { id: number; login: string; type: "User" | "Organization" };
  };
  return {
    id: body.id,
    account: { id: body.account.id, login: body.account.login, type: body.account.type },
  };
}

/**
 * Resolve a branch's HEAD commit sha. Used to stamp the graph build with the
 * exact ref it was computed from.
 */
export async function getBranchHead(
  installationId: number,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  const r = await appFetch(installationId, `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`);
  if (!r.ok) return readError(r, "getBranchHead");
  const body = (await r.json()) as { commit?: { sha?: string } };
  const sha = body.commit?.sha;
  if (!sha) {
    log.withMetadata({ owner, repo, branch }).warn("branch response missing commit.sha");
    throw error(502, "GitHub branch HEAD missing sha");
  }
  return sha;
}

/**
 * Stream a gzipped tarball of `{owner}/{repo}` at `ref`. GitHub responds with
 * a 302 to a signed S3 URL; `fetch` follows redirects automatically. Caller is
 * responsible for piping through gunzip + tar.
 */
export async function fetchRepoTarball(
  installationId: number,
  owner: string,
  repo: string,
  ref: string,
): Promise<ReadableStream<Uint8Array>> {
  const r = await appFetch(installationId, `/repos/${owner}/${repo}/tarball/${encodeURIComponent(ref)}`);
  if (!r.ok) return readError(r, "fetchRepoTarball");
  if (!r.body) {
    log.withMetadata({ owner, repo, ref }).warn("tarball response had no body");
    throw error(502, "GitHub tarball response had no body");
  }
  return r.body;
}

export async function listInstallationRepos(installationId: number): Promise<LinkedRepo[]> {
  const out: LinkedRepo[] = [];
  let page = 1;
  while (true) {
    const r = await appFetch(installationId, `/installation/repositories?per_page=100&page=${page}`);
    if (!r.ok) return readError(r, "listInstallationRepos");
    const body = (await r.json()) as {
      repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        private: boolean;
        default_branch: string | null;
        pushed_at: string | null;
        owner: { login: string };
      }>;
    };
    for (const repo of body.repositories) {
      out.push({
        id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch ?? null,
        pushedAt: repo.pushed_at ?? null,
      });
    }
    if (body.repositories.length < 100) break;
    page += 1;
    if (page > 10) break;
  }
  return out;
}
