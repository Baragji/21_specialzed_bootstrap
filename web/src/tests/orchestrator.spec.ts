import { createTask, getTaskStatus } from '../api/orchestrator';

(globalThis as any).ORCHESTRATOR_BASE = 'http://orchestrator-alb-639428703.eu-north-1.elb.amazonaws.com';

// Mock fetch
const g: any = globalThis as any;

describe('orchestrator api client', () => {
  beforeEach(() => {
    g.fetch = undefined;
  });

  it('createTask success → 201', async () => {
    g.fetch = jest.fn().mockResolvedValueOnce({ status: 201, json: async () => ({ issue_number: 123, issue_url: 'x' }) });
    const res = await createTask({ owner: 'o', repo: 'r', title: 't', objective: 'o' });
    expect(res.issue_number).toBe(123);
  });

  it('createTask validation → 400 banner', async () => {
    g.fetch = jest.fn().mockResolvedValueOnce({ status: 400 });
    await expect(createTask({ owner: 'o', repo: 'r', title: 't', objective: 'o' })).rejects.toThrow('validation error');
  });

  it('createTask unexpected status', async () => {
    g.fetch = jest.fn().mockResolvedValueOnce({ status: 418 });
    await expect(createTask({ owner: 'o', repo: 'r', title: 't', objective: 'o' })).rejects.toThrow('unexpected 418');
  });

  it('getTaskStatus retry then success', async () => {
    g.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ issue_number: 7, repo: 'x/y', state: 'CREATED', checks: { required: [], completed: {}, green: false }, timeline: [], updatedAt: Date.now() }) });
    const res = await getTaskStatus(7);
    expect(res.issue_number).toBe(7);
  });

  it('getTaskStatus retry then fail', async () => {
    g.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(getTaskStatus(8)).rejects.toThrow();
  });

  it('getTaskStatus both attempts not ok', async () => {
    g.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(getTaskStatus(9)).rejects.toThrow('status 503');
  });

  it('createTask times out', async () => {
    jest.useFakeTimers();
    // Promise that never resolves to trigger withTimeout
    g.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
    const p = createTask({ owner: 'o', repo: 'r', title: 't', objective: 'o' });
    jest.advanceTimersByTime(8000);
    await expect(p).rejects.toThrow('request timeout');
    jest.useRealTimers();
  });

  it('getTaskStatus immediate success', async () => {
    g.fetch = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ issue_number: 11, repo: 'x/y', state: 'CREATED', checks: { required: [], completed: {}, green: false }, timeline: [], updatedAt: Date.now() }) });
    const res = await getTaskStatus(11);
    expect(res.issue_number).toBe(11);
  });

  it('getTaskStatus unknown error', async () => {
    // Both attempts throw undefined to keep lastErr undefined
    g.fetch = jest.fn()
      .mockImplementationOnce(() => { throw undefined; })
      .mockImplementationOnce(() => { throw undefined; });
    await expect(getTaskStatus(12)).rejects.toThrow('unknown error');
  });
});
