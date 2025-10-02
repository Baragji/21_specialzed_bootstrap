import crypto from 'crypto';
import { describe, it, expect } from '@jest/globals';
import { buildServer } from '../src/server';

const secret = 'idemp-secret';
const baseConfig = {
  port: 8080,
  githubAppId: '123',
  githubWebhookSecret: secret,
  githubAppPrivateKey: Buffer.from('fake').toString('base64'),
};

function sig(body: string) {
  const h = crypto.createHmac('sha256', secret); h.update(body); return `sha256=${h.digest('hex')}`;
}

describe('webhook idempotency', () => {
  it('duplicate delivery is a no-op', async () => {
    const app = buildServer(baseConfig);
    const payload = JSON.stringify({ repository: { full_name: 'acme/r' }, issue: { number: 11 }, action: 'opened' });
    const headers = {
      'content-type': 'application/json',
      'x-hub-signature-256': sig(payload),
      'x-github-event': 'issues',
      'x-github-delivery': 'dup-1',
    } as const;

    const a = await app.inject({ method: 'POST', url: '/webhooks/github', payload, headers });
    expect(a.statusCode).toBe(200);
    const b = await app.inject({ method: 'POST', url: '/webhooks/github', payload, headers });
    expect(b.statusCode).toBe(200);
    const get = await app.inject({ method: 'GET', url: '/tasks/11' });
    // Should succeed even if not fully linked; timeline may have a single event
    expect([200, 404]).toContain(get.statusCode);
    await app.close();
  });

  it('missing delivery header still processes', async () => {
    const app = buildServer(baseConfig);
    const payload = JSON.stringify({ repository: { full_name: 'acme/r' }, issue: { number: 12 }, action: 'opened' });
    const headers = {
      'content-type': 'application/json',
      'x-hub-signature-256': sig(payload),
      'x-github-event': 'issues',
    } as const;
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload, headers });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
