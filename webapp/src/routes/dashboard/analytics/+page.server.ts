import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { buildAnalytics } from "$lib/server/analytics";
import { isRangeKey, type RangeKey } from "$lib/dashboard/analytics-types";

export const config = { maxDuration: 30 };

export const load: PageServerLoad = async ({ locals, url, setHeaders }) => {
  if (!locals.user) throw redirect(303, "/login");

  const rangeParam = url.searchParams.get("range") ?? "7d";
  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "7d";

  // Browser cache only — keeps repeated nav inside the dashboard cheap.
  // Tenants aren't shared so `private` is appropriate; 60s is enough to
  // absorb URL-state toggles without staleness biting an FDE.
  setHeaders({ "cache-control": "private, max-age=60" });

  const payload = await buildAnalytics(locals.user.uid, range);
  return payload;
};
