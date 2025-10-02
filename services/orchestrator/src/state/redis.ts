import type { RedisClientType } from 'redis';
import { createClient } from 'redis';

export interface RedisLike {
  set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<unknown>;
  get(key: string): Promise<string | null>;
  expire(key: string, ttlSec: number): Promise<boolean>;
  lPush(key: string, value: string): Promise<number>;
  lTrim(key: string, start: number, stop: number): Promise<string>;
  lRange(key: string, start: number, stop: number): Promise<string[]>;
}

export function createRedisClientFromEnv(): RedisLike | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;

  const tls = (process.env.REDIS_TLS ?? 'false').toLowerCase() === 'true';

  const client: RedisClientType = createClient({
    url,
    socket: tls ? { tls: true } : undefined,
  });

  // Connect lazily; caller should rely on auto-reconnect.
  // Ignore connection errors; Fastify app should still boot and fallback is handled elsewhere if URL missing.
  client.connect().catch(() => {
    // swallow to avoid crashing; runtime operations will surface errors.
  });

  // Wrap Redis client to match RedisLike
  const like: RedisLike = {
    async set(key, value, options) {
      const opts: any = {};
      if (options?.EX !== undefined) opts.EX = options.EX;
      if (options?.NX !== undefined) opts.NX = options.NX;
      return client.set(key, value, opts);
    },
    get: (key) => client.get(key),
    expire: (key, ttlSec) => client.expire(key, ttlSec),
    lPush: (key, value) => client.lPush(key, value),
    lTrim: (key, start, stop) => client.lTrim(key, start, stop),
    lRange: (key, start, stop) => client.lRange(key, start, stop),
  };

  return like;
}

export function prefix(): string {
  const p = process.env.REDIS_PREFIX ?? 'orc:';
  return p.endsWith(':') ? p : `${p}:`;
}

export function stateTtlSec(): number {
  const raw = process.env.STATE_TTL_SEC;
  const num = raw ? Number.parseInt(raw, 10) : 7 * 24 * 60 * 60; // default 7 days
  return Number.isFinite(num) && num > 0 ? num : 7 * 24 * 60 * 60;
}

export function taskKey(issue_number: number): string {
  return `${prefix()}task:${issue_number}`;
}

export function timelineKey(issue_number: number): string {
  return `${prefix()}timeline:${issue_number}`;
}

export function seenDeliveryKey(deliveryId: string): string {
  return `${prefix()}seen:${deliveryId}`;
}
