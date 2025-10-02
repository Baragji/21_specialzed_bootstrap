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

describe('handlers branch coverage', () => {
  it('issues closed with merged true -> MERGED', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'closed',
      issue: { number: 801, pull_request: { merged: true } },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'issues', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/801' });
    expect(getRes.json().state).toBe('MERGED');
  });

  it('issues closed without merge -> FAILED', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'closed',
      issue: { number: 802, pull_request: { merged: false } },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'issues', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/802' });
    expect(getRes.json().state).toBe('FAILED');
  });

  it('pull_request ready_for_review -> PR_OPEN (fallback to pr number)', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'ready_for_review',
      pull_request: { number: 811, title: 'No refs here' },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
    }});
    const getRes = await app.inject({ method: 'GET', url: '/tasks/811' });
    const json = getRes.json();
    expect(json.state).toBe('PR_OPEN');
    expect(json.pr_number).toBe(811);
  });

  it('pull_request closed merged true -> MERGED for referenced issue', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'closed',
      pull_request: { number: 812, title: 'Closes #803', merged: true },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
    }});
    const getRes = await app.inject({ method: 'GET', url: '/tasks/803' });
    expect(getRes.json().state).toBe('MERGED');
  });

  it('check_run timed_out -> CHECKS_RED', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    // Seed PR link to #804
    const pr = {
      action: 'opened',
      pull_request: { number: 814, title: 'Implements #804' },
      repository: { full_name: 'acme/repo' },
    };
    let body = JSON.stringify(pr);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
    }});

    const cr = {
      action: 'completed',
      check_run: { name: 'test', conclusion: 'timed_out', pull_requests: [{ number: 814, title: 'Implements #804' }] },
      repository: { full_name: 'acme/repo' },
    };
    body = JSON.stringify(cr);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'check_run', 'x-hub-signature-256': sign(SECRET, body)
    }});
    const getRes = await app.inject({ method: 'GET', url: '/tasks/804' });
    expect(getRes.json().state).toBe('CHECKS_RED');
  });
});
