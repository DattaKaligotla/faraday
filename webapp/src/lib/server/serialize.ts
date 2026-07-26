import type { TenantDoc, TenantVersionDoc, GithubIntegration, IntegrationDoc } from "./models";
import type { RepoGraphRecord, ComponentGraph } from "./schemas";

function tsToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const ts = value as { toDate?: () => Date };
  if (typeof ts.toDate === "function") return ts.toDate().toISOString();
  return null;
}

export interface SerializedIntegration {
  publishableKey: string;
  ownerId: string;
  ownerEmail: string | null;
  allowedOrigins: string[];
  plan: string;
  createdAt: string | null;
}

export function serializeIntegration(data: IntegrationDoc): SerializedIntegration {
  return {
    publishableKey: data.publishableKey,
    ownerId: data.ownerId,
    ownerEmail: data.ownerEmail ?? null,
    allowedOrigins: data.allowedOrigins ?? [],
    plan: data.plan ?? "free",
    createdAt: tsToIso(data.createdAt),
  };
}

export interface SerializedGithub {
  installationId: number | null;
  account: { id: number | null; login: string | null; type: string | null } | null;
  linkedRepo: NonNullable<GithubIntegration["linkedRepo"]> | null;
  linkedRepos: NonNullable<GithubIntegration["linkedRepos"]>;
  installedAt: string | null;
}

export function serializeGithub(gh: GithubIntegration): SerializedGithub {
  const account = gh.account ?? null;
  return {
    installationId: gh.installationId ?? null,
    account: account
      ? {
          id: account.id,
          login: account.login,
          type: account.type,
        }
      : null,
    linkedRepo: gh.linkedRepo ?? null,
    linkedRepos: gh.linkedRepos ?? [],
    installedAt: tsToIso(gh.installedAt),
  };
}

export interface SerializedTenant {
  orgId: string;
  orgName: string | null;
  tenantName: string;
  website: string;
  productDescription: string;
  memory: string;
  source: "manual" | "generated";
  currentVersionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  generatedAt: string | null;
}

export function serializeTenant(data: TenantDoc): SerializedTenant {
  return {
    orgId: data.orgId,
    orgName: data.orgName ?? null,
    tenantName: data.tenantName ?? "",
    website: data.website ?? "",
    productDescription: data.productDescription ?? "",
    memory: data.memory ?? "",
    source: data.source ?? "manual",
    currentVersionId: data.currentVersionId ?? null,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    generatedAt: tsToIso(data.generatedAt),
  };
}

export interface SerializedTenantVersion {
  id: string;
  memory: string;
  source: "manual" | "generated";
  authorUid: string;
  note: string | null;
  createdAt: string | null;
}

export function serializeTenantVersion(data: TenantVersionDoc & { id: string }): SerializedTenantVersion {
  return {
    id: data.id,
    memory: data.memory,
    source: data.source,
    authorUid: data.authorUid,
    note: data.note ?? null,
    createdAt: tsToIso(data.createdAt),
  };
}

export interface SerializedRepoGraph {
  repoFullName: string;
  graphRef: string | null;
  status: "idle" | "building" | "failed";
  error: string | null;
  generatedAt: string | null;
  startedAt: string | null;
  lastEventAt: string | null;
  graph: ComponentGraph | null;
}

export function serializeRepoGraph(data: RepoGraphRecord): SerializedRepoGraph {
  return {
    repoFullName: data.repoFullName,
    graphRef: data.graphRef ?? null,
    status: data.status,
    error: data.error ?? null,
    generatedAt: tsToIso(data.generatedAt),
    startedAt: tsToIso(data.startedAt),
    lastEventAt: tsToIso(data.lastEventAt),
    graph: data.graph ?? null,
  };
}

export { tsToIso };
