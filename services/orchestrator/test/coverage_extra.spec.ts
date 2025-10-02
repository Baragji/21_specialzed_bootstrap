import { describe, it, expect } from '@jest/globals';
import { upsertTask, getTask, setCheck } from '../src/state/store';
import { buildServer, loadConfigFromEnv } from '../src/server';
import crypto from 'crypto';

function sign(secret: string, body: string) {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hmac}`;
}

const SECRET = 'testsecret-extra';

describe('coverage extras for store/router/handlers', () => {
  it('getTask returns record even when TTL expired (branch)', () => {
    const t = upsertTask({ issue_number: 100, repo: 'acme/repo' });
    expect(getTask(100)).toBeDefined();
    // Expire TTL and re-read to hit branch
    t.ttlAt = Date.now() - 1;
    const again = getTask(100);
    expect(again).toBeDefined();
  });

  it('setCheck ignores unknown check names (branch)', () => {
    upsertTask({ issue_number: 101, repo: 'acme/repo' });
    const before = getTask(101)!;
    const prevGreen = before.checks.green;
    setCheck(101, 'unknown-check', true);
    const after = getTask(101)!;
    // Required completion map should not gain new keys
    expect(Object.keys(after.checks.completed)).toEqual(Object.keys(before.checks.completed));
    expect(after.checks.green).toBe(prevGreen);
  });

  it('store branches: missing keys return undefined and upsert updates existing', () => {
    // getTask on missing
    expect(getTask(99999)).toBeUndefined();

    // addEvent/setState/setPr/setCheck when missing
    // Import lazily to avoid circular issues in ts-jest path mapping
    const store = require('../src/state/store');
    expect(store.addEvent(88888, { ts: Date.now(), event: 'noop' })).toBeUndefined();
    expect(store.setState(88888, 'CREATED')).toBeUndefined();
    expect(store.setPr(88888, 1)).toBeUndefined();
    expect(store.setCheck(88888, 'test', true)).toBeUndefined();

    // upsert creates then updates existing
    const rec1 = store.upsertTask({ issue_number: 777, repo: 'acme/one' });
    const firstUpdatedAt = rec1.updatedAt;
    const rec2 = store.upsertTask({ issue_number: 777, repo: 'acme/two' });
    expect(rec2.repo).toBe('acme/two');
    expect(rec2.updatedAt).toBeGreaterThanOrEqual(firstUpdatedAt);
  });

  it('issue_comment with agent-like body moves to IN_PROGRESS', async () => {
    const app = buildServer(loadConfigFromEnv({
      PORT: '0',
      GITHUB_WEBHOOK_SECRET: SECRET,
      GITHUB_APP_ID: '123',
      GITHUB_APP_PRIVATE_KEY: 'dummy',
    } as any));

    // seed CREATED via issues.opened
    const created = {
      action: 'opened',
      issue: { number: 102, labels: [{ name: 'ai-task' }] },
      repository: { full_name: 'acme/repo' },
    };
    let body = JSON.stringify(created);
    await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'issues', 'x-hub-signature-256': sign(SECRET, body)
      }
    });

    // post a comment that looks like an agent plan
    const commentEvt = {
      action: 'created',
      issue: { number: 102 },
      comment: { body: 'Plan: steps for implementation' },
      repository: { full_name: 'acme/repo' },
    };
    body = JSON.stringify(commentEvt);
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'issue_comment', 'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/102' });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().state).toBe('IN_PROGRESS');
  });

  it('workflow_run failure flips CHECKS_RED (branch)', async () => {
    const app = buildServer(loadConfigFromEnv({
      PORT: '0',
      GITHUB_WEBHOOK_SECRET: SECRET,
      GITHUB_APP_ID: '123',
      GITHUB_APP_PRIVATE_KEY: 'dummy',
    } as any));

    // Seed PR_OPEN via PR event referencing #103
    const prEvt = {
      action: 'opened',
      pull_request: { number: 77, title: 'Link to #103' },
      repository: { full_name: 'acme/repo' },
    };
    let body = JSON.stringify(prEvt);
    await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'pull_request', 'x-hub-signature-256': sign(SECRET, body)
      }
    });

    // Now a failing workflow_run for required check "test" that references #103
    const wrEvt = {
      action: 'completed',
      workflow_run: { name: 'test', conclusion: 'failure', display_title: 'Build for #103' },
      repository: { full_name: 'acme/repo' },
    };
    body = JSON.stringify(wrEvt);
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'workflow_run', 'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: '/tasks/103' });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json().state).toBe('CHECKS_RED');
  });

  it('workflow_run success can flip CHECKS_GREEN when all checks true', async () => {
    const app = buildServer(loadConfigFromEnv({
      PORT: '0', GITHUB_WEBHOOK_SECRET: SECRET, GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'dummy',
    } as any));
    const issue = 700;
    // seed task and set all but one required checks to true
    const store = require('../src/state/store');
    store.upsertTask({ issue_number: issue, repo: 'acme/repo' });
    const required: string[] = store.REQUIRED_CHECKS;
    for (const name of required.slice(0, required.length - 1)) {
      store.setCheck(issue, name, true);
    }
    const last = required[required.length - 1];

    const wrEvt = {
      action: 'completed',
      workflow_run: { name: last, conclusion: 'success', display_title: `Build for #${issue}` },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(wrEvt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'workflow_run', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
    const getRes = await app.inject({ method: 'GET', url: `/tasks/${issue}` });
    expect(getRes.json().state).toBe('CHECKS_GREEN');
  });

  it('check_run without issue reference is ignored (early return)', async () => {
    const app = buildServer(loadConfigFromEnv({
      PORT: '0', GITHUB_WEBHOOK_SECRET: SECRET, GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'dummy',
    } as any));
    const evt = {
      action: 'completed',
      check_run: { name: 'test', conclusion: 'success', pull_requests: [{ number: 11, title: 'no link here' }] },
      repository: { full_name: 'acme/repo' },
    };
    const body = JSON.stringify(evt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'check_run', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
  });

  it('workflow_run without payload is ignored (early return)', async () => {
    const app = buildServer(loadConfigFromEnv({
      PORT: '0', GITHUB_WEBHOOK_SECRET: SECRET, GITHUB_APP_ID: '123', GITHUB_APP_PRIVATE_KEY: 'dummy',
    } as any));
    const evt = { action: 'requested' };
    const body = JSON.stringify(evt);
    const res = await app.inject({ method: 'POST', url: '/webhooks/github', payload: body, headers: {
      'content-type': 'application/json', 'x-github-event': 'workflow_run', 'x-hub-signature-256': sign(SECRET, body)
    }});
    expect(res.statusCode).toBe(200);
  });

  it('unknown event is accepted and ignored (router default)', async () => {
    const app = buildServer(loadConfigFromEnv({
      PORT: '0',
      GITHUB_WEBHOOK_SECRET: SECRET,
      GITHUB_APP_ID: '123',
      GITHUB_APP_PRIVATE_KEY: 'dummy',
    } as any));

    const payload = { ping: true };
    const body = JSON.stringify(payload);
    const res = await app.inject({
      method: 'POST', url: '/webhooks/github', payload: body,
      headers: {
        'content-type': 'application/json', 'x-github-event': 'ping', 'x-hub-signature-256': sign(SECRET, body)
      }
    });
    expect(res.statusCode).toBe(200);
  });
});
