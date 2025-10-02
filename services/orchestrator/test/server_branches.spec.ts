import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { buildServer, loadConfigFromEnv, createRateLimiter, resolveTimeWindowMs, firstHeaderValue, rateLimitErrorResponse } from '../src/server';
import crypto from 'crypto';

const SECRET = 'branch-secret';

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

describe('server branches and handler edges', () => {
  const REAL_ENV = process.env;
  beforeEach(() => {
    process.env = { ...REAL_ENV };
  });
  afterEach(() => {
    process.env = REAL_ENV;
  });

  it('returns 400 when event header missing', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const payload = { ping: true };
    const body = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json',
        // no 'x-github-event'
        'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when event header is empty string', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const body = JSON.stringify({ hello: 'world' });
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json',
        'x-github-event': '   ',
        'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 on invalid json parse with json content-type', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const bad = '{not-json:';
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: bad,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issues',
        'x-hub-signature-256': sign(SECRET, bad)
      }
    });
    expect(res.statusCode).toBe(400);
  });

  it('accepts non-json content-type and skips handler dispatch', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const body = '{still-not-json}';
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'text/plain',
        'x-github-event': 'issues',
        'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(200);
  });

  it('internal rate limiter returns false on second hit with max=1', () => {
    const limiter = createRateLimiter({ max: 1, timeWindow: '1 minute' });
    const req: any = { ip: '1.2.3.4' };
    expect(limiter(req)).toBe(true);
    expect(limiter(req)).toBe(false);
  });

  it('helper utilities cover corner cases', () => {
    expect(resolveTimeWindowMs(500)).toBe(500);
    expect(resolveTimeWindowMs('250')).toBe(250);
    expect(resolveTimeWindowMs('2 s')).toBe(2000);
    expect(resolveTimeWindowMs('bad')).toBe(60000);
    expect(firstHeaderValue(['a', 'b'])).toBe('a');
    expect(firstHeaderValue(undefined)).toBeUndefined();
    expect(rateLimitErrorResponse()).toEqual({ status: 'rate_limited' });
  });
});

// Handler edges in isolation via router are covered indirectly; add one for check_run cancelled
describe('check_run cancelled marks CHECKS_RED', () => {
  it('sets red state on cancelled conclusion', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    // Seed a PR linking #555 so issue linkage exists for check_run
    const open = {
      action: 'opened',
      pull_request: { number: 10, title: 'Implements #555' },
      repository: { full_name: 'acme/repo' },
    };
    let body = JSON.stringify(open);
    await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
      }
    });

    const checkRun = {
      action: 'completed',
      check_run: {
        name: 'codeql',
        conclusion: 'cancelled',
        pull_requests: [{ number: 10, title: 'Implements #555' }],
      },
      repository: { full_name: 'acme/repo' },
    };
    body = JSON.stringify(checkRun);
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'check_run', 'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/555' });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().state).toBe('CHECKS_RED');
  });
});

describe('issues closed not merged -> FAILED', () => {
  it('marks task FAILED when issue closed without merge', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const created = {
      action: 'opened',
      issue: { number: 606, labels: [{ name: 'ai-task' }] },
      repository: { full_name: 'acme/repo' },
    };
    let body = JSON.stringify(created);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'issues', 'x-hub-signature-256': sign(SECRET, body)
    }});

    const prClosed = {
      action: 'closed',
      pull_request: { number: 999, title: 'Fixes #606', merged: false },
      repository: { full_name: 'acme/repo' },
    };
    body = JSON.stringify(prClosed);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
    }});

    const getRes = await app.inject({ method: 'GET', url: '/tasks/606' });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().state).toBe('FAILED');
  });
});
