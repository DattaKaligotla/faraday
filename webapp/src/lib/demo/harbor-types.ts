export type HarborRunStatus = "queued" | "building" | "running" | "verifying" | "completed" | "failed";

export type HarborReward = {
  overall: number;
  safety: number;
  quality: number;
  human_oversight: number;
  throughput: number;
};

export type HarborActionEvent = {
  sequence: number;
  action: string;
  result: string;
};

export type HarborEnvironmentConfig = {
  name: string;
  unitsAtRisk: number;
  alternateRouteCapacity: number;
  approvalRequired: boolean;
  rewardWeights: {
    safety: number;
    quality: number;
    humanOversight: number;
    throughput: number;
  };
};

export type HarborRun = {
  id: string;
  status: HarborRunStatus;
  phase: string;
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  logs: string[];
  actions: HarborActionEvent[];
  environment: HarborEnvironmentConfig;
  reward?: HarborReward;
  jobPath?: string;
  error?: string;
};

export type HarborRuntimeStatus = {
  available: boolean;
  docker: {
    available: boolean;
    version?: string;
    error?: string;
  };
  harbor: {
    available: boolean;
    version?: string;
  };
  task: {
    available: boolean;
    name: string;
    schema: string;
    environment: string;
  };
};
