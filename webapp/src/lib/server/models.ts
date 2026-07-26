export type {
  RateLimits,
  LinkedRepo,
  GithubIntegration,
  IntegrationDoc,
  ToolCall,
  SavedSnapshot,
  RequestRecord,
  GithubInstallationDoc,
  TenantSource,
  TenantDoc,
  TenantVersionDoc,
} from "./schemas";

export interface ProjectConfig {
  projectId: string;
  ownerId: string;
  allowedOrigins: string[];
  secretKey: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  plan: string;
}

export interface Message {
  role: string;
  content: unknown;
}

export interface AgentRequest {
  system?: string;
  tools?: Array<Record<string, unknown>>;
  messages: Message[];
  pageContext?: Record<string, unknown> | null;
}

export interface SnapshotPayload {
  overrides: Record<string, unknown>;
  insertedComponents: Record<string, unknown[]>;
  containerOrder?: Record<string, string[]>;
  injections?: Record<string, unknown[]>;
  themeVars?: Record<string, string>;
  layoutModes?: Record<string, unknown>;
  email: string;
  messages: Array<Record<string, unknown>>;
  pageContext?: Record<string, unknown> | null;
  /** Total streaming time the user waited (ms), summed across chat turns. */
  latencyMs: number;
  /** Time-to-first-token on the first turn of the session (ms). */
  firstTokenMs: number;
}
