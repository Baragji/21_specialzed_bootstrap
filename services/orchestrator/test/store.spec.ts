import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Utility to reset module cache between env-mode tests
function freshImportStore() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/state/store') as typeof import('../src/state/store');
}

describe('state store (memory mode)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('upsert, appendTimeline (trim), seenDelivery dedupe, getTaskState shape', async () => {
    const store = freshImportStore();
    store.upsertTask({ issue_number: 201, repo: 'acme/repo' });
    for (let i = 0; i < 55; i++) {
      store.addEvent(201, { ts: i, event: `m${i}` });
      await store.appendTimeline(201, { ts: i, event: `m${i}` });
    }
    const first = await store.seenDelivery('mem-1');
    const second = await store.seenDelivery('mem-1');
    expect(first).toBe(false);
    expect(second).toBe(true);
    const s = await store.getTaskState(201);
    expect(s.timeline.length).toBeGreaterThanOrEqual(50);
    expect(s.last_event?.event).toBe(`m54`);
    expect(s.checks.required.length).toBeGreaterThan(0);
  });
});

describe('state store (redis mocked)', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://fake';
    process.env.REDIS_PREFIX = 'orc:test:';
  });

  it('persists TTL on task set, trims and orders timeline, dedupes deliveries', async () => {
    const memory = new Map<string, string>();
    const lists = new Map<string, string[]>();
    let lastEX = 0;

    jest.mock('../src/state/redis', () => ({
      createRedisClientFromEnv: () => ({
        async set(key: string, value: string, options?: { EX?: number; NX?: boolean }) {
          if (options?.NX && memory.has(key)) return null;
          if (options?.EX) lastEX = options.EX;
          memory.set(key, value);
          return 'OK';
        },
        async get(key: string) { return memory.get(key) ?? null; },
        async expire() { return true; },
        async lPush(key: string, value: string) {
          const arr = lists.get(key) ?? [];
          arr.unshift(value);
          lists.set(key, arr);
          return arr.length;
        },
        async lTrim(key: string, start: number, stop: number) {
          const arr = lists.get(key) ?? [];
          const trimmed = arr.slice(start, stop + 1);
          lists.set(key, trimmed);
          return 'OK';
        },
        async lRange(key: string, start: number, stop: number) {
          const arr = lists.get(key) ?? [];
          return arr.slice(start, stop + 1);
        },
      }),
      taskKey: (n: number) => `orc:test:task:${n}`,
      timelineKey: (n: number) => `orc:test:timeline:${n}`,
      seenDeliveryKey: (d: string) => `orc:test:seen:${d}`,
      stateTtlSec: () => 60,
      prefix: () => 'orc:test:',
    }));

    const store: typeof import('../src/state/store') = freshImportStore();
    await store.setTaskState(301, { repo: 'acme/repo', state: 'IN_PROGRESS' });
    for (let i = 0; i < 60; i++) {
      await store.appendTimeline(301, { ts: i, event: `e${i}` });
    }
    const s = await store.getTaskState(301);
    expect(lastEX).toBeGreaterThan(0);
    expect(s.timeline.length).toBe(50);
    expect(s.timeline[0].event).toBe('e10');
    expect(s.timeline[49].event).toBe('e59');
    const d1 = await store.seenDelivery('d-1');
    const d2 = await store.seenDelivery('d-1');
    expect(d1).toBe(false);
    expect(d2).toBe(true);

    // small metrics helpers
    expect(['redis','memory']).toContain(store.storeMode());
    expect(typeof store.approxTaskCount()).toBe('number');
  });
});
