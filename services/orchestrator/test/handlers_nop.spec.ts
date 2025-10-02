import { describe, it, expect } from '@jest/globals';
import { buildServer, loadConfigFromEnv } from '../src/server';
import crypto from 'crypto';

const SECRET = 'handlers-secret';

function sign(secret: string, body: string) {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

const baseEnv = {
  PORT: '0',
  GITHUB_WEBHOOK_SECRET: SECRET,
  GITHUB_APP_ID: '123',
  GITHUB_APP_PRIVATE_KEY: 'dummy',
} as any;

describe('handlers early-return branches (no-op cases)', () => {
  it('check_run without PR linkage -> no-op', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'completed',
      check_run: { name: 'test', conclusion: 'success', pull_requests: [] },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'check_run',
        'x-hub-signature-256': sign(SECRET, body),
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it('workflow_run without #issue in title/branch/message -> no-op', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'completed',
      workflow_run: { name: 'test', conclusion: 'success', display_title: 'Build main', head_branch: 'main', head_commit: { message: 'chore: update' } },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'workflow_run',
        'x-hub-signature-256': sign(SECRET, body),
      },
    });
    expect(res.statusCode).toBe(200);
  });
});
