import { createHash } from "node:crypto";
import { head } from "@vercel/blob";
import { env as dynamicEnv } from "$env/dynamic/private";
import { GITHUB_API, getInstallationToken } from "./github-app";
import { child } from "./logger";

const log = child("snapshot-cache");
const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"] as const;

interface ResolveInput {
  installationId: number;
  owner: string;
  repo: string;
  defaultBranch: string;
}

export interface SnapshotResolution {
  key: string;
  present: boolean;
  lockfileName: string;
  lockfileHash: string;
}

/**
 * Look up the customer repo's lockfile via the GitHub Contents API, hash it,
 * and check whether a matching snapshot exists in Vercel Blob.
 *
 * Returns null when the repo has no recognized lockfile (e.g. a non-JS repo,
 * or one not yet `npm install`ed) — callers should treat that as "no snapshot,
 * fall back to fresh clone+install in the sandbox."
 */
export async function resolveSnapshotKey(input: ResolveInput): Promise<SnapshotResolution | null> {
  const token = await getInstallationToken(input.installationId);

  for (const name of LOCKFILES) {
    const r = await fetch(
      `${GITHUB_API}/repos/${input.owner}/${input.repo}/contents/${name}?ref=${encodeURIComponent(input.defaultBranch)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.raw",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (r.status === 404) continue;
    if (!r.ok) {
      log.withMetadata({ status: r.status, name }).warn("lockfile fetch failed");
      continue;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const hash = createHash("sha256").update(buf).digest("hex");
    const key = `repo-snapshots/${input.owner}/${input.repo}@${hash}.tar.zst`;

    let present = false;
    try {
      await head(key, { token: dynamicEnv.BLOB_READ_WRITE_TOKEN });
      present = true;
    } catch {
      present = false;
    }

    return { key, present, lockfileName: name, lockfileHash: hash };
  }

  return null;
}
