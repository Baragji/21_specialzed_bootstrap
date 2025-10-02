import { createRedisClientFromEnv, seenDeliveryKey, taskKey, timelineKey, stateTtlSec } from './redis';

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

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h (memory fallback)

// Memory fallback store
const memStore = new Map<number, TaskRecord>();
const memDeliveries = new Set<string>();
let warnedNoRedis = false;

// Redis client (if configured)
const redis = createRedisClientFromEnv();
if (!redis && !warnedNoRedis) {
  warnedNoRedis = true;
  // Single startup warning
  // eslint-disable-next-line no-console
  console.warn('[orchestrator] REDIS_URL not set — using in-memory store (non-durable)');
}

function ensureMem(record: TaskRecord) {
  record.updatedAt = Date.now();
  record.ttlAt = record.updatedAt + DEFAULT_TTL_MS;
}

function defaultRecord(issue_number: number, repo: string): TaskRecord {
  const now = Date.now();
  return {
    issue_number,
    repo,
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
}

async function persistTaskToRedis(rec: TaskRecord): Promise<void> {
  if (!redis) return;
  const key = taskKey(rec.issue_number);
  const ttl = stateTtlSec();
  await redis.set(key, JSON.stringify(rec), { EX: ttl });
}

async function readTaskFromRedis(issue_number: number): Promise<TaskRecord | undefined> {
  if (!redis) return undefined;
  const raw = await redis.get(taskKey(issue_number));
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as TaskRecord;
    return parsed;
  } catch {
    return undefined;
  }
}

async function appendTimelineRedis(issue_number: number, evt: TimelineEvent): Promise<void> {
  if (!redis) return;
  const key = timelineKey(issue_number);
  const ttl = stateTtlSec();
  await redis.lPush(key, JSON.stringify(evt));
  await redis.lTrim(key, 0, 49); // keep last 50 newest-first
  await redis.expire(key, ttl);
}

async function readTimelineFromRedis(issue_number: number): Promise<TimelineEvent[]> {
  if (!redis) return [];
  const key = timelineKey(issue_number);
  const items = await redis.lRange(key, 0, 49);
  const parsed = items.map((s) => {
    try {
      return JSON.parse(s) as TimelineEvent;
    } catch {
      return undefined;
    }
  }).filter(Boolean) as TimelineEvent[];
  // lRange returns newest-first due to lPush, reverse to chronological order
  return parsed.reverse();
}

export async function setTaskState(issue_number: number, statePayload: Partial<Omit<TaskRecord, 'issue_number' | 'timeline' | 'updatedAt' | 'ttlAt'>> & { repo?: string; state?: TaskStateName }): Promise<TaskRecord> {
  // Update memory first for local access
  const existing = memStore.get(issue_number);
  const repoCandidate = statePayload.repo ?? (existing ? existing.repo : undefined) ?? 'unknown/unknown';
  const record = existing ?? defaultRecord(issue_number, repoCandidate);
  if (statePayload.repo) record.repo = statePayload.repo;
  if (statePayload.state) record.state = statePayload.state;
  if (statePayload.pr_number !== undefined) record.pr_number = statePayload.pr_number;
  if (statePayload.checks) record.checks = statePayload.checks;
  ensureMem(record);
  memStore.set(issue_number, record);
  // Persist to Redis (best-effort)
  await persistTaskToRedis(record);
  return record;
}

export async function getTaskState(issue_number: number): Promise<{
  issue_number: number;
  state: TaskStateName;
  last_event?: TimelineEvent;
  timeline: TimelineEvent[];
  repo: string;
  pr_number?: number;
  checks: { required: string[]; green: boolean };
  updatedAt: number;
}> {
  const fromRedis = await readTaskFromRedis(issue_number);
  const rec = fromRedis ?? memStore.get(issue_number);
  if (!rec) {
    throw Object.assign(new Error('not_found'), { code: 'NOT_FOUND' });
  }
  const timeline = fromRedis ? await readTimelineFromRedis(issue_number) : rec.timeline.slice(-50);
  const last_event = timeline.length ? timeline[timeline.length - 1] : undefined;
  return {
    issue_number: rec.issue_number,
    state: rec.state,
    last_event,
    timeline,
    repo: rec.repo,
    pr_number: rec.pr_number,
    checks: { required: rec.checks.required, green: rec.checks.green },
    updatedAt: rec.updatedAt,
  };
}

export async function appendTimeline(issue_number: number, event: TimelineEvent): Promise<void> {
  const rec = memStore.get(issue_number);
  if (rec) {
    rec.timeline.push(event);
    if (rec.timeline.length > 50) {
      rec.timeline = rec.timeline.slice(-50);
    }
    ensureMem(rec);
    memStore.set(issue_number, rec);
  }
  await appendTimelineRedis(issue_number, event);
}

export async function seenDelivery(delivery_id: string): Promise<boolean> {
  if (redis) {
    const res = await redis.set(seenDeliveryKey(delivery_id), '1', { NX: true, EX: stateTtlSec() });
    return res === null; // true means already seen
  }
  const already = memDeliveries.has(delivery_id);
  memDeliveries.add(delivery_id);
  return already;
}

// Back-compat synchronous helpers used by existing handlers/tests
export function getTask(issue_number: number): TaskRecord | undefined {
  const rec = memStore.get(issue_number);
  if (!rec) return undefined;
  if (Date.now() > rec.ttlAt) return rec;
  return rec;
}

export function upsertTask(base: { issue_number: number; repo: string }): TaskRecord {
  const existing = memStore.get(base.issue_number);
  if (existing) {
    existing.repo = base.repo;
    ensureMem(existing);
    void persistTaskToRedis(existing);
    return existing;
  }
  const record = defaultRecord(base.issue_number, base.repo);
  memStore.set(base.issue_number, record);
  void persistTaskToRedis(record);
  return record;
}

export function addEvent(issue_number: number, evt: TimelineEvent): TaskRecord | undefined {
  const rec = memStore.get(issue_number);
  if (!rec) return undefined;
  rec.timeline.push(evt);
  if (rec.timeline.length > 50) rec.timeline = rec.timeline.slice(-50);
  ensureMem(rec);
  void appendTimeline(issue_number, evt);
  return rec;
}

export function setState(issue_number: number, state: TaskStateName): TaskRecord | undefined {
  const rec = memStore.get(issue_number);
  if (!rec) return undefined;
  rec.state = state;
  ensureMem(rec);
  void setTaskState(issue_number, { state });
  return rec;
}

export function setPr(issue_number: number, pr_number: number): TaskRecord | undefined {
  const rec = memStore.get(issue_number);
  if (!rec) return undefined;
  rec.pr_number = pr_number;
  ensureMem(rec);
  void setTaskState(issue_number, { pr_number });
  return rec;
}

export function setCheck(issue_number: number, checkName: string, ok: boolean): TaskRecord | undefined {
  const rec = memStore.get(issue_number);
  if (!rec) return undefined;
  if (rec.checks.required.includes(checkName)) {
    rec.checks.completed[checkName] = ok;
  }
  rec.checks.green = rec.checks.required.every((n) => rec.checks.completed[n] === true);
  ensureMem(rec);
  void setTaskState(issue_number, { checks: rec.checks });
  return rec;
}

// Metrics helpers
export function storeMode(): 'redis' | 'memory' {
  return redis ? 'redis' : 'memory';
}

export function approxTaskCount(): number {
  return redis ? -1 : memStore.size;
}
