import { describe, it, expect } from '@jest/globals';
import { prefix, taskKey, timelineKey, seenDeliveryKey, stateTtlSec } from '../src/state/redis';

describe('redis helpers', () => {
  it('prefix formatting and key building', () => {
    const original = process.env.REDIS_PREFIX;
    process.env.REDIS_PREFIX = 'orc';
    expect(prefix()).toBe('orc:');
    process.env.REDIS_PREFIX = 'orc:';
    expect(prefix()).toBe('orc:');
    process.env.REDIS_PREFIX = original;

    expect(taskKey(1)).toContain('task:1');
    expect(timelineKey(2)).toContain('timeline:2');
    expect(seenDeliveryKey('abc')).toContain('seen:abc');
  });

  it('ttl parsing with default', () => {
    const original = process.env.STATE_TTL_SEC;
    delete process.env.STATE_TTL_SEC;
    expect(stateTtlSec()).toBeGreaterThan(0);
    process.env.STATE_TTL_SEC = '0';
    expect(stateTtlSec()).toBeGreaterThan(0);
    process.env.STATE_TTL_SEC = '86400';
    expect(stateTtlSec()).toBe(86400);
    process.env.STATE_TTL_SEC = original;
  });
});
