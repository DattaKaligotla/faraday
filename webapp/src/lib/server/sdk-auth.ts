import jwt from "jsonwebtoken";
import { error } from "@sveltejs/kit";
import { getDb, parseDoc } from "./firestore";
import { child } from "./logger";
import { integrationDocSchema } from "./schemas";
import type { ProjectConfig } from "./models";

const log = child("sdk-auth");
const CACHE_TTL = 60 * 1000;
const cache = new Map<string, { project: ProjectConfig; expires: number }>();

async function lookupProject(publishableKey: string): Promise<ProjectConfig> {
  const now = Date.now();
  const cached = cache.get(publishableKey);
  if (cached && cached.expires > now) return cached.project;

  const snap = await getDb().collection("integrations").where("publishableKey", "==", publishableKey).limit(1).get();

  if (snap.empty) {
    log.withMetadata({ publishableKey }).warn("401: no project found for publishable key");
    throw error(401, "Unauthorized");
  }

  const doc = snap.docs[0];
  const data = parseDoc(doc, integrationDocSchema, "integration");
  if (!data) throw error(401, "Unauthorized");

  const project: ProjectConfig = {
    projectId: doc.id,
    ownerId: data.ownerId,
    allowedOrigins: data.allowedOrigins ?? [],
    secretKey: data.secretKey,
    rateLimits: {
      requestsPerMinute: data.rateLimits?.requestsPerMinute ?? 10,
      requestsPerDay: data.rateLimits?.requestsPerDay ?? 100,
    },
    plan: data.plan ?? "free",
  };

  cache.set(publishableKey, { project, expires: now + CACHE_TTL });
  return project;
}

function verifyOrigin(project: ProjectConfig, origin: string): void {
  if (!origin) return;
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return;
  if (!project.allowedOrigins.includes(origin)) {
    throw error(403, "Origin not allowed");
  }
}

export interface SdkClaims {
  sub: string | null;
  anonymous?: boolean;
  [key: string]: unknown;
}

function verifyUserToken(project: ProjectConfig, userToken: string): SdkClaims {
  if (!userToken) return { sub: null, anonymous: true };
  try {
    const decoded = jwt.verify(userToken, project.secretKey, {
      algorithms: ["HS256"],
    }) as Record<string, unknown>;
    if (typeof decoded.sub === "undefined" || typeof decoded.exp === "undefined") {
      throw new Error("missing required claims (sub, exp)");
    }
    return decoded as SdkClaims;
  } catch (e) {
    log.withMetadata({ projectId: project.projectId }).withError(e).warn("401: invalid user token");
    throw error(401, "Unauthorized");
  }
}

export async function verifyRequest(
  publishableKey: string,
  userToken: string,
  origin: string,
): Promise<{ project: ProjectConfig; claims: SdkClaims }> {
  const project = await lookupProject(publishableKey);
  verifyOrigin(project, origin);
  const claims = verifyUserToken(project, userToken);
  return { project, claims };
}
