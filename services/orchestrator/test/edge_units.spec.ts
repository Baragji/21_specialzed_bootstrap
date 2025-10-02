import { describe, it, expect } from '@jest/globals';
import { buildServer, loadConfigFromEnv } from '../src/server';
import { handlePullRequestEvent } from '../src/webhooks/handlers/pull_request';
import { handleCheckRunEvent } from '../src/webhooks/handlers/check_run';
import { handleWorkflowRunEvent } from '../src/webhooks/handlers/workflow_run';
import { handleIssuesEvent } from '../src/webhooks/handlers/issues';
import crypto from 'crypto';

const SECRET = 'edge-secret';
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

describe('server GET /tasks branches', () => {
  it('returns 400 for invalid issue number and 404 when not found', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const bad = await app.inject({ method: 'GET', url: '/tasks/abc' });
    expect(bad.statusCode).toBe(400);
    const nf = await app.inject({ method: 'GET', url: '/tasks/123456' });
    expect(nf.statusCode).toBe(404);
  });
});

describe('handlers early return branches', () => {
  it('handlePullRequestEvent early returns when payload missing pr', () => {
    // Should not throw
    handlePullRequestEvent({ action: 'opened', repository: { full_name: 'x/y' } });
  });

  it('handleCheckRunEvent early returns when payload missing check_run', () => {
    handleCheckRunEvent({ action: 'completed', repository: { full_name: 'x/y' } });
  });

  it('handleWorkflowRunEvent early returns when payload missing workflow_run', () => {
    handleWorkflowRunEvent({ action: 'completed', repository: { full_name: 'x/y' } });
  });
});

describe('workflow_run inference via head_commit.message and head_branch', () => {
  it('infers issue number from head commit message', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'completed',
      workflow_run: { name: 'test', conclusion: 'failure', head_commit: { message: 'Fixes #901' } },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'workflow_run', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/901' });
    expect(getRes.json().state).toBe('CHECKS_RED');
  });

  it('infers issue number from head_branch when formatted as feature/#902', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'completed',
      workflow_run: { name: 'codeql', conclusion: 'success', head_branch: 'feature/#902' },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'workflow_run', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/902' });
    expect(getRes.statusCode).toBe(200);
  });
});

describe('issues opened without ai-task label exercises false branch', () => {
  it('does not alter state beyond upsert default', async () => {
    const app = buildServer(loadConfigFromEnv(baseEnv));
    const evt = {
      action: 'opened',
      issue: { number: 903, labels: [{ name: 'bug' }] },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'issues', 'x-hub-signature-256': sign(SECRET, body)
    }});
    const getRes = await app.inject({ method: 'GET', url: '/tasks/903' });
    expect(getRes.json().state).toBe('CREATED');
  });
});
