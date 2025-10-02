import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// fresh import helper
function fresh() {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('../src/state/store') as typeof import('../src/state/store');
}

describe('store extra branches (memory mode)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
  });

  it('set* and addEvent return undefined when record missing; appendTimeline with no mem record', async () => {
    const store = fresh();
    // Missing record cases
    expect(store.setState(50001, 'IN_PROGRESS')).toBeUndefined();
    expect(store.setPr(50001, 123)).toBeUndefined();
    expect(store.setCheck(50001, 'test', true)).toBeUndefined();
    expect(store.addEvent(50001, { ts: Date.now(), event: 'noop' })).toBeUndefined();
    // appendTimeline branch when rec undefined (no throw)
    await store.appendTimeline(50001, { ts: Date.now(), event: 'only-redis' });
  });

  it('setCheck for non-required check does not flip green', async () => {
    const store = fresh();
    const rec = store.upsertTask({ issue_number: 50002, repo: 'acme/repo' });
    expect(rec.checks.green).toBe(false);
    // Non-required check
    const updated = store.setCheck(50002, 'non-required', true)!;
    expect(updated.checks.green).toBe(false);
    expect(updated.checks.completed['non-required']).toBeUndefined();
  });

  it('upsert existing record updates repo (existing branch)', () => {
    const store = fresh();
    const r1 = store.upsertTask({ issue_number: 50003, repo: 'acme/one' });
    const r2 = store.upsertTask({ issue_number: 50003, repo: 'acme/two' });
    expect(r1).toBe(r2);
    expect(r2.repo).toBe('acme/two');
    expect(store.approxTaskCount()).toBeGreaterThan(0);
  });
});
