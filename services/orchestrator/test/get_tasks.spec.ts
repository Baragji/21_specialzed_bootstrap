import { describe, it, expect } from '@jest/globals';
import { buildServer } from '../src/server';
import { upsertTask, addEvent } from '../src/state/store';

const baseConfig = {
  port: 8080,
  githubAppId: '1',
  githubWebhookSecret: 's',
  githubAppPrivateKey: Buffer.from('k').toString('base64'),
};

describe('GET /tasks/:issue_number', () => {
  it('returns 400 for invalid number and 404 for not found', async () => {
    const app = buildServer(baseConfig);
    const bad = await app.inject({ method: 'GET', url: '/tasks/abc' });
    expect(bad.statusCode).toBe(400);
    const missing = await app.inject({ method: 'GET', url: '/tasks/999999' });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });

  it('returns expected shape when present', async () => {
    const app = buildServer(baseConfig);
    const rec = upsertTask({ issue_number: 321, repo: 'acme/repo' });
    addEvent(321, { ts: 1, event: 'test' });
    const res = await app.inject({ method: 'GET', url: '/tasks/321' });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.issue_number).toBe(321);
    expect(json.timeline.length).toBeGreaterThan(0);
    expect(json.checks).toHaveProperty('required');
    await app.close();
  });
});
