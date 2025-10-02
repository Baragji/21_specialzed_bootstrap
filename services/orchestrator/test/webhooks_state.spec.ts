import { buildServer, loadConfigFromEnv } from '../src/server';
import crypto from 'crypto';

function sign(secret: string, body: string) {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

const SECRET = 'testsecret';

const baseEnv = {
  PORT: '0',
  GITHUB_WEBHOOK_SECRET: SECRET,
  GITHUB_APP_ID: '123',
  GITHUB_APP_PRIVATE_KEY: 'dummy',
};

describe('webhooks + state', () => {
  const config = loadConfigFromEnv(baseEnv as any);
  const app = buildServer(config);

  it('rejects invalid signature', async () => {
    const body = JSON.stringify({ ping: true });
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: body,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'ping',
        'x-hub-signature-256': 'sha256=badsign',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('accepts issues opened and creates CREATED state', async () => {
    const payload = {
      action: 'opened',
      issue: { number: 42, labels: [{ name: 'ai-task' }] },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issues',
        'x-hub-signature-256': sign(SECRET, body),
      }
    });
    expect(res.statusCode).toBe(200);

    const getRes = await app.inject({ method: 'GET', url: '/tasks/42' });
    expect(getRes.statusCode).toBe(200);
    const data = getRes.json();
    expect(data.state).toBe('CREATED');
    expect(data.issue_number).toBe(42);
  });

  it('pull_request opened → PR_OPEN with linkage', async () => {
    const payload = {
      action: 'opened',
      pull_request: { number: 10, title: 'Implements feature #42', body: 'Ref #42' },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(payload);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
    } });
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/42' });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().state).toBe('PR_OPEN');
  });

  it('workflow_run success flips required check and can become CHECKS_GREEN', async () => {
    const payload = {
      action: 'completed',
      workflow_run: {
        name: 'test',
        conclusion: 'success',
        head_branch: 'aws_gh_setup',
        display_title: 'PR #10 for #42',
        head_commit: { message: 'work on #42' }
      },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(payload);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'workflow_run', 'x-hub-signature-256': sign(SECRET, body)
    } });
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/42' });
    expect(getRes.statusCode).toBe(200);
    const data = getRes.json();
    expect(data.checks.required).toContain('test');
  });
});
