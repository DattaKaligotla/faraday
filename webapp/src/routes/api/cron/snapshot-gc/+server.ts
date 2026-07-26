import { error, json, type RequestHandler } from "@sveltejs/kit";
import { list, del } from "@vercel/blob";
import { env as dynamicEnv } from "$env/dynamic/private";

const PREFIX = "repo-snapshots/";
const MAX_AGE_DAYS = 14;

function authorized(event: Parameters<RequestHandler>[0]): boolean {
  const secret = dynamicEnv.CRON_SECRET;
  if (!secret) return true;
  const auth = event.request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

interface BlobMeta {
  pathname: string;
  uploadedAt: Date;
  size: number;
}

function repoKey(pathname: string): string | null {
  // repo-snapshots/<owner>/<repo>@<hash>.tar.zst
  const m = pathname.match(/^repo-snapshots\/(.+?)\/(.+?)@([0-9a-f]+)\.tar\.zst$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export const GET: RequestHandler = async (event) => {
  if (!authorized(event)) throw error(401, "unauthorized");

  const log = event.locals.log.withContext({ component: "snapshot-gc" });
  const token = dynamicEnv.BLOB_READ_WRITE_TOKEN;
  const cutoffMs = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const all: BlobMeta[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000, token });
    for (const b of page.blobs) {
      all.push({ pathname: b.pathname, uploadedAt: b.uploadedAt, size: b.size });
    }
    if (!page.hasMore || !page.cursor) break;
    cursor = page.cursor;
  }

  const newestPerRepo = new Map<string, BlobMeta>();
  for (const b of all) {
    const repo = repoKey(b.pathname);
    if (!repo) continue;
    const cur = newestPerRepo.get(repo);
    if (!cur || cur.uploadedAt < b.uploadedAt) newestPerRepo.set(repo, b);
  }

  const toDelete: string[] = [];
  for (const b of all) {
    const repo = repoKey(b.pathname);
    if (!repo) continue;
    const newest = newestPerRepo.get(repo);
    const ageMs = Date.now() - b.uploadedAt.getTime();
    const isCurrent = newest && newest.pathname === b.pathname;
    if (!isCurrent && ageMs > cutoffMs) toDelete.push(b.pathname);
    else if (isCurrent && ageMs > cutoffMs * 2) toDelete.push(b.pathname);
  }

  for (const path of toDelete) {
    await del(path, token ? { token } : undefined).catch((e) =>
      log.withMetadata({ path }).withError(e).warn("del failed"),
    );
  }

  return json({ scanned: all.length, deleted: toDelete.length });
};
