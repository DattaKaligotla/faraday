import { z } from "zod";

const firestoreTimestamp = z.union([
  z.custom<{ toDate: () => Date }>(
    (v) => typeof v === "object" && v !== null && typeof (v as { toDate?: unknown }).toDate === "function",
  ),
  z.date(),
  z.string(),
  z.null(),
]);

export const rateLimitsSchema = z.looseObject({
  requestsPerMinute: z.number().optional(),
  requestsPerDay: z.number().optional(),
});

export const linkedRepoSchema = z.looseObject({
  id: z.number(),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  private: z.boolean().optional(),
  defaultBranch: z.string().nullable().optional(),
  pushedAt: z.string().nullable().optional(),
});

export const githubAccountSchema = z.looseObject({
  id: z.number(),
  login: z.string(),
  type: z.enum(["User", "Organization"]),
});

export const githubIntegrationSchema = z.looseObject({
  installationId: z.number().optional(),
  account: githubAccountSchema.optional(),
  linkedRepo: linkedRepoSchema.nullable().optional(),
  linkedRepos: z.array(linkedRepoSchema).optional(),
  installedAt: firestoreTimestamp.optional(),
});

export const integrationDocSchema = z.looseObject({
  publishableKey: z.string(),
  secretKey: z.string(),
  ownerId: z.string(),
  ownerEmail: z.string().nullable().optional(),
  allowedOrigins: z.array(z.string()).optional(),
  rateLimits: rateLimitsSchema.optional(),
  plan: z.string().optional(),
  createdAt: firestoreTimestamp.optional(),
  github: githubIntegrationSchema.optional(),
});

export const toolCallSchema = z.looseObject({
  /** Anthropic tool_use block id. Pairs with the matching tool_result.tool_use_id. */
  id: z.string().optional(),
  name: z.string(),
  input: z.record(z.string(), z.unknown()),
});

export const savedSnapshotSchema = z.looseObject({
  overrides: z.record(z.string(), z.unknown()).optional(),
  insertedComponents: z.record(z.string(), z.array(z.unknown())).optional(),
  containerOrder: z.record(z.string(), z.array(z.string())).optional(),
  injections: z.record(z.string(), z.array(z.unknown())).optional(),
  themeVars: z.record(z.string(), z.string()).optional(),
  layoutModes: z.record(z.string(), z.unknown()).optional(),
});

export const prPhaseSchema = z.enum([
  "preparing",
  "agent_running",
  "opening_pr",
  "uploading_snapshot",
  "done",
  "failed",
]);

export const prInfoSchema = z.looseObject({
  jobId: z.string(),
  status: z.enum(["running", "pr_opened", "pr_merged", "failed"]),
  phase: prPhaseSchema.optional(),
  repoFullName: z.string(),
  branch: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  number: z.number().nullable().optional(),
  summary: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  startedAt: firestoreTimestamp.optional(),
  openedAt: firestoreTimestamp.optional(),
  mergedAt: firestoreTimestamp.optional(),
  closedAt: firestoreTimestamp.optional(),
  lastEventAt: firestoreTimestamp.optional(),
});

export const requestRecordSchema = z.looseObject({
  prompt: z.string().optional(),
  assistantText: z.string().optional(),
  toolCalls: z.array(toolCallSchema).optional(),
  status: z.string().optional(),
  error: z.string().nullable().optional(),
  endUserId: z.string().nullable().optional(),
  endUserEmail: z.string().nullable().optional(),
  endUserClaims: z.record(z.string(), z.unknown()).optional(),
  orgId: z.string().nullable().optional(),
  orgName: z.string().nullable().optional(),
  origin: z.string().optional(),
  pageContext: z.record(z.string(), z.unknown()).nullable().optional(),
  projectId: z.string().optional(),
  savedSnapshot: savedSnapshotSchema.optional(),
  messages: z.array(z.record(z.string(), z.unknown())).optional(),
  createdAt: firestoreTimestamp.optional(),
  pr: prInfoSchema.optional(),
  // SDK-measured timings for the saved session. Total streaming time the
  // user waited (sum across chat turns) and time-to-first-token on the
  // first turn. Both `0` when the save originated from inline-edit only
  // (no chat activity) — aggregators filter 0s out of percentile math.
  latencyMs: z.number(),
  firstTokenMs: z.number(),
});

export const componentNodeSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  file: z.string(),
  line: z.number(),
  modifiableIds: z.array(z.string()),
});

export const componentEdgeSchema = z.looseObject({
  from: z.string(),
  to: z.string(),
});

export const componentGraphSchema = z.looseObject({
  components: z.array(componentNodeSchema),
  edges: z.array(componentEdgeSchema),
  files: z.number(),
  parsedFiles: z.number(),
  skippedFiles: z.number(),
});

export const repoGraphRecordSchema = z.looseObject({
  repoFullName: z.string(),
  graphRef: z.string().nullable().optional(),
  status: z.enum(["idle", "building", "failed"]),
  error: z.string().nullable().optional(),
  generatedAt: firestoreTimestamp.optional(),
  startedAt: firestoreTimestamp.optional(),
  lastEventAt: firestoreTimestamp.optional(),
  graph: componentGraphSchema.nullable().optional(),
});

export const githubInstallationDocSchema = z.looseObject({
  uid: z.string(),
  accountLogin: z.string().optional(),
  createdAt: firestoreTimestamp.optional(),
});

export const tenantSourceSchema = z.enum(["manual", "generated"]);

export const tenantDocSchema = z.looseObject({
  orgId: z.string(),
  orgName: z.string().nullable().optional(),
  tenantName: z.string().optional(),
  website: z.string().optional(),
  productDescription: z.string().optional(),
  memory: z.string(),
  source: tenantSourceSchema.optional(),
  currentVersionId: z.string().nullable().optional(),
  createdAt: firestoreTimestamp.optional(),
  updatedAt: firestoreTimestamp.optional(),
  generatedAt: firestoreTimestamp.optional(),
});

export const tenantVersionDocSchema = z.looseObject({
  memory: z.string(),
  source: tenantSourceSchema,
  authorUid: z.string(),
  note: z.string().optional(),
  createdAt: firestoreTimestamp.optional(),
});

export type RateLimits = z.infer<typeof rateLimitsSchema>;
export type LinkedRepo = z.infer<typeof linkedRepoSchema>;
export type GithubIntegration = z.infer<typeof githubIntegrationSchema>;
export type IntegrationDoc = z.infer<typeof integrationDocSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
export type SavedSnapshot = z.infer<typeof savedSnapshotSchema>;
export type RequestRecord = z.infer<typeof requestRecordSchema>;
export type PrInfo = z.infer<typeof prInfoSchema>;
export type GithubInstallationDoc = z.infer<typeof githubInstallationDocSchema>;
export type ComponentNode = z.infer<typeof componentNodeSchema>;
export type ComponentEdge = z.infer<typeof componentEdgeSchema>;
export type ComponentGraph = z.infer<typeof componentGraphSchema>;
export type RepoGraphRecord = z.infer<typeof repoGraphRecordSchema>;
export type TenantSource = z.infer<typeof tenantSourceSchema>;
export type TenantDoc = z.infer<typeof tenantDocSchema>;
export type TenantVersionDoc = z.infer<typeof tenantVersionDocSchema>;
