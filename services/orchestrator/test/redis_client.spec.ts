import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('createRedisClientFromEnv', () => {
  const originalEnv = process.env;
  let createdOptions: any[] = [];
  let calls: Record<string, any[]>;

  function mockRedisModule() {
    createdOptions = [];
    calls = { connect: [], set: [], get: [], expire: [], lPush: [], lTrim: [], lRange: [] };
    jest.resetModules();
    jest.doMock('redis', () => ({
      createClient: (opts: any) => {
        createdOptions.push(opts);
        return {
          connect: () => { calls.connect.push([]); return Promise.resolve(); },
          set: (k: string, v: string, o?: any) => { calls.set.push([k, v, o]); return Promise.resolve('OK'); },
          get: (k: string) => { calls.get.push([k]); return Promise.resolve(null); },
          expire: (k: string, t: number) => { calls.expire.push([k, t]); return Promise.resolve(true); },
          lPush: (k: string, v: string) => { calls.lPush.push([k, v]); return Promise.resolve(1); },
          lTrim: (k: string, s: number, e: number) => { calls.lTrim.push([k, s, e]); return Promise.resolve('OK'); },
          lRange: (k: string, s: number, e: number) => { calls.lRange.push([k, s, e]); return Promise.resolve([]); },
        };
      },
    }));
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  it('returns undefined when REDIS_URL not set', async () => {
    mockRedisModule();
    delete process.env.REDIS_URL;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createRedisClientFromEnv } = require('../src/state/redis');
    const client = createRedisClientFromEnv();
    expect(client).toBeUndefined();
  });

  it('creates client without TLS by default and maps methods', async () => {
    mockRedisModule();
    process.env.REDIS_URL = 'redis://localhost:6379/0';
    delete process.env.REDIS_TLS;
    const { createRedisClientFromEnv, taskKey, seenDeliveryKey, timelineKey } = require('../src/state/redis');
    const like = createRedisClientFromEnv();
    expect(like).toBeDefined();
    // Wait a tick to let connect fire
    await Promise.resolve();
    expect(createdOptions[0]).toMatchObject({ url: 'redis://localhost:6379/0' });
    expect(createdOptions[0].socket).toBeUndefined();

    await like!.set(taskKey(1), JSON.stringify({ a: 1 }), { EX: 10 });
    await like!.get(taskKey(1));
    await like!.expire(taskKey(1), 10);
    await like!.lPush(timelineKey(1), JSON.stringify({}));
    await like!.lTrim(timelineKey(1), 0, 49);
    await like!.lRange(timelineKey(1), 0, 49);
    await like!.set(seenDeliveryKey('abc'), '1', { NX: true, EX: 5 });

    expect(calls.set.length).toBeGreaterThan(0);
    expect(calls.get.length).toBe(1);
    expect(calls.expire.length).toBe(1);
    expect(calls.lPush.length).toBe(1);
    expect(calls.lTrim.length).toBe(1);
    expect(calls.lRange.length).toBe(1);
  });

  it('enables TLS when REDIS_TLS=true', async () => {
    mockRedisModule();
    process.env.REDIS_URL = 'redis://example:6379/0';
    process.env.REDIS_TLS = 'true';
    const { createRedisClientFromEnv } = require('../src/state/redis');
    createRedisClientFromEnv();
    await Promise.resolve();
    expect(createdOptions[0].socket).toEqual({ tls: true });
  });
});
