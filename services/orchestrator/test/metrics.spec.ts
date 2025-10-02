import { describe, it, expect } from '@jest/globals';
import { buildServer } from '../src/server';

describe('metrics endpoint', () => {
  it('returns basic metrics without secrets', async () => {
    const app = buildServer({
      port: 8080,
      githubAppId: '1',
      githubWebhookSecret: 's',
      githubAppPrivateKey: Buffer.from('k').toString('base64'),
    });
    const res = await app.inject({ method: 'GET', url: '/metricsz' });
    expect(res.statusCode).toBe(200);
    const json = res.json();
    expect(json.mode === 'redis' || json.mode === 'memory').toBe(true);
    expect(typeof json.uptimeSec).toBe('number');
    expect(json.version).toBeDefined();
    expect(json).not.toHaveProperty('GITHUB_APP_PRIVATE_KEY');
    await app.close();
  });

  it('exposes task key counts approximately', async () => {
    const app = buildServer({
      port: 8080,
      githubAppId: '1',
      githubWebhookSecret: 's',
      githubAppPrivateKey: Buffer.from('k').toString('base64'),
    });
    const res = await app.inject({ method: 'GET', url: '/metricsz' });
    const json = res.json();
    expect(typeof json.keys.tasks).toBe('number');
    await app.close();
  });
});
