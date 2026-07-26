import { error, type RequestEvent } from "@sveltejs/kit";

export function requireUser(event: RequestEvent) {
  if (!event.locals.user) throw error(401, "Not authenticated");
  return event.locals.user;
}
