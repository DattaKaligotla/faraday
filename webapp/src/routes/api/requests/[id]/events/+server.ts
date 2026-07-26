import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireUser } from "$lib/server/auth-guard";
import { getDb } from "$lib/server/firestore";

export const GET: RequestHandler = async (event) => {
  const user = requireUser(event);
  const requestId = event.params.id!;
  const after = parseInt(event.url.searchParams.get("after") ?? "-1", 10);
  const startSeq = Number.isFinite(after) ? after : -1;

  const eventsCol = getDb()
    .collection("integrations")
    .doc(user.uid)
    .collection("requests")
    .doc(requestId)
    .collection("events");

  const reqSnap = await eventsCol.parent!.get();
  if (!reqSnap.exists) throw error(404, "Request not found");

  const snap = await eventsCol.where("seq", ">", startSeq).orderBy("seq", "asc").limit(500).get();

  const items = snap.docs.map((d) => {
    const { seq, jobId, ts, ...rest } = d.data();
    return {
      seq: seq as number,
      jobId: jobId as string,
      ts: ts && typeof ts.toMillis === "function" ? ts.toMillis() : null,
      event: rest,
    };
  });

  return json({ events: items });
};
