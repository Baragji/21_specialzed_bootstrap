export type TaskRequest = {
  owner: string;
  repo: string;
  title: string;
  objective: string;
  constraints?: {
    allowedPaths?: string[];
    forbiddenPaths?: string[];
    timeCapMin?: number;
    costCapUSD?: number;
  };
  testSpec?: string[];
  acceptance?: string[];
  labels?: string[];
};

export type CheckSummary = {
  required: string[];
  completed: Record<string, boolean>;
  green: boolean;
};

export type TaskStatusResponse = {
  issue_number: number;
  repo: string;
  state: 'CREATED' | 'IN_PROGRESS' | 'PR_OPEN' | 'CHECKS_GREEN' | 'CHECKS_RED' | 'MERGED' | 'FAILED';
  pr_number?: number;
  checks: CheckSummary;
  timeline: Array<{ ts: number; event: string; action?: string; pr_number?: number; check_name?: string; conclusion?: string; sha?: string }>;
  updatedAt: number;
};
