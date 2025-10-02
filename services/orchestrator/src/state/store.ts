export type TaskStateName =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'PR_OPEN'
  | 'CHECKS_GREEN'
  | 'CHECKS_RED'
  | 'MERGED'
  | 'FAILED';

export interface CheckSummary {
  required: string[];
  completed: Record<string, boolean>;
  green: boolean;
}

export interface TimelineEvent {
  ts: number;
  event: string;
  action?: string;
  pr_number?: number;
  check_name?: string;
  conclusion?: string;
  sha?: string;
}

export interface TaskRecord {
  issue_number: number;
  repo: string; // owner/repo
  state: TaskStateName;
  pr_number?: number;
  checks: CheckSummary;
  timeline: TimelineEvent[];
  updatedAt: number;
  ttlAt: number;
}

export const REQUIRED_CHECKS = [
  'test',
  'codeql',
  'sboms-orchestrator',
  'Attest build provenance (Orchestrator)'
];

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const store = new Map<number, TaskRecord>();

function ensure(record: TaskRecord) {
  record.updatedAt = Date.now();
  record.ttlAt = record.updatedAt + DEFAULT_TTL_MS;
}

export function getTask(issue_number: number): TaskRecord | undefined {
  const rec = store.get(issue_number);
  if (!rec) return undefined;
  if (Date.now() > rec.ttlAt) return rec; // do not auto-delete to keep debugging window
  return rec;
}

export function upsertTask(base: {
  issue_number: number;
  repo: string;
}): TaskRecord {
  const now = Date.now();
  const existing = store.get(base.issue_number);
  if (existing) {
    existing.repo = base.repo;
    existing.updatedAt = now;
    existing.ttlAt = now + DEFAULT_TTL_MS;
    return existing;
  }
  const record: TaskRecord = {
    issue_number: base.issue_number,
    repo: base.repo,
    state: 'CREATED',
    pr_number: undefined,
    checks: {
      required: [...REQUIRED_CHECKS],
      completed: Object.fromEntries(REQUIRED_CHECKS.map((n) => [n, false])),
      green: false,
    },
    timeline: [],
    updatedAt: now,
    ttlAt: now + DEFAULT_TTL_MS,
  };
  store.set(base.issue_number, record);
  return record;
}

export function addEvent(issue_number: number, evt: TimelineEvent): TaskRecord | undefined {
  const rec = store.get(issue_number);
  if (!rec) return undefined;
  rec.timeline.push(evt);
  ensure(rec);
  return rec;
}

export function setState(issue_number: number, state: TaskStateName): TaskRecord | undefined {
  const rec = store.get(issue_number);
  if (!rec) return undefined;
  rec.state = state;
  ensure(rec);
  return rec;
}

export function setPr(issue_number: number, pr_number: number): TaskRecord | undefined {
  const rec = store.get(issue_number);
  if (!rec) return undefined;
  rec.pr_number = pr_number;
  ensure(rec);
  return rec;
}

export function setCheck(issue_number: number, checkName: string, ok: boolean): TaskRecord | undefined {
  const rec = store.get(issue_number);
  if (!rec) return undefined;
  if (rec.checks.required.includes(checkName)) {
    rec.checks.completed[checkName] = ok;
  }
  rec.checks.green = rec.checks.required.every((n) => rec.checks.completed[n] === true);
  ensure(rec);
  return rec;
}
