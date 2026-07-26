import { json } from "@sveltejs/kit";
import { getRuntimeStatus } from "$lib/server/harbor-demo";

export async function GET() {
  return json(await getRuntimeStatus(), {
    headers: {
      "cache-control": "no-store",
    },
  });
}
