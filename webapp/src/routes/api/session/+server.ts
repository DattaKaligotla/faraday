import { json, type RequestHandler } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { createSessionCookie, revokeUserSessions, verifySessionCookie } from "$lib/server/firebase-admin";

const SESSION_COOKIE = "__session";
const EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000;
const MAX_AGE_S = 5 * 24 * 60 * 60;

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
  let idToken: string | undefined;
  try {
    const body = (await request.json()) as { idToken?: string };
    idToken = body.idToken;
  } catch {
    return json({ message: "Invalid JSON body" }, { status: 400 });
  }
  if (!idToken) return json({ message: "Missing idToken" }, { status: 400 });

  try {
    const sessionCookie = await createSessionCookie(idToken, EXPIRES_IN_MS);
    cookies.set(SESSION_COOKIE, sessionCookie, {
      path: "/",
      httpOnly: true,
      secure: !dev,
      sameSite: "lax",
      maxAge: MAX_AGE_S,
    });
    return json({ ok: true });
  } catch (e) {
    locals.log.withError(e).warn("session cookie mint failed");
    return json({ message: "Failed to create session" }, { status: 401 });
  }
};

export const DELETE: RequestHandler = async ({ cookies, locals }) => {
  const existing = cookies.get(SESSION_COOKIE);
  if (existing) {
    try {
      const decoded = await verifySessionCookie(existing, false);
      await revokeUserSessions(decoded.uid);
    } catch (e) {
      locals.log.withError(e).debug("session revoke skipped");
    }
  }
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return json({ ok: true });
};
