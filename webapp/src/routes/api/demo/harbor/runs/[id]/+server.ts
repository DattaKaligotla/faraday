import { json } from "@sveltejs/kit";
import { getHarborRun } from "$lib/server/harbor-demo";

export async function GET({ params }: { params: { id: string } }) {
  const run = getHarborRun(params.id);
  if (!run) return json({ message: "Harbor run not found." }, { status: 404 });

  return json(run, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
