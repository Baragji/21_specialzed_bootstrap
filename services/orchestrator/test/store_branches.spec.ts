import { jest, describe, it, expect, beforeEach } from '@jest/globals';

function freshImportStore() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/state/store') as typeof import('../src/state/store');
}

describe('store branches: memory getTask TTL branch', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('covers both ttl branches in getTask()', () => {
    const store = freshImportStore();
    const rec = store.upsertTask({ issue_number: 991, repo: 'acme/repo' });
    // Force expired branch
    rec.ttlAt = 0;
    const a = store.getTask(991);
    expect(a?.issue_number).toBe(991);
    // Force non-expired branch
    rec.ttlAt = Date.now() + 10_000;
    const b = store.getTask(991);
    expect(b?.issue_number).toBe(991);
  });
});

describe('store branches: redis JSON parse paths', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://fake';
    process.env.REDIS_PREFIX = 'orc:test:';
  });

  it('readTaskFromRedis parse error -> NOT_FOUND when no memory record', async () => {
    jest.mock('../src/state/redis', () => ({
      createRedisClientFromEnv: () => ({
        async get() { return '%%%'; }, // invalid JSON
        async set() { return 'OK'; },
        async expire() { return true; },
        async lPush() { return 0; },
        async lTrim() { return 'OK'; },
        async lRange() { return []; },
      }),
      taskKey: (n: number) => `orc:test:task:${n}`,
      timelineKey: (n: number) => `orc:test:timeline:${n}`,
      seenDeliveryKey: (d: string) => `orc:test:seen:${d}`,
      stateTtlSec: () => 60,
      prefix: () => 'orc:test:',
    }));

    const store: typeof import('../src/state/store') = freshImportStore();
    await expect(store.getTaskState(12345)).rejects.toHaveProperty('code', 'NOT_FOUND');
  });

  it('readTimelineFromRedis filters invalid JSON and preserves order', async () => {
    const issue = 992;
    const validRec = {
      issue_number: issue,
      repo: 'acme/repo',
      state: 'CREATED',
      checks: { required: [], completed: {}, green: false },
      timeline: [],
      updatedAt: Date.now(),
      ttlAt: Date.now() + 1000,
    };
    jest.mock('../src/state/redis', () => ({
      createRedisClientFromEnv: () => ({
        async get() { return JSON.stringify(validRec); },
        async set() { return 'OK'; },
        async expire() { return true; },
        async lPush() { return 0; },
        async lTrim() { return 'OK'; },
        async lRange() {
          // Newest-first (as if lPush), include an invalid JSON entry
          return [
            'not-json',
            JSON.stringify({ ts: 2, event: 'b' }),
            JSON.stringify({ ts: 1, event: 'a' }),
          ];
        },
      }),
      taskKey: (n: number) => `orc:test:task:${n}`,
      timelineKey: (n: number) => `orc:test:timeline:${n}`,
      seenDeliveryKey: (d: string) => `orc:test:seen:${d}`,
      stateTtlSec: () => 60,
      prefix: () => 'orc:test:',
    }));

    const store: typeof import('../src/state/store') = freshImportStore();
    const s = await store.getTaskState(issue);
    // Invalid entry should be dropped, remaining reversed to chronological order
    expect(s.timeline.map((e) => e.event)).toEqual(['a', 'b']);
    expect(s.last_event?.event).toBe('b');
  });
});
