import nock from 'nock';

import { buildServer } from '../src/server';
import { resetInstallationCache } from '../src/github/appAuth';
import * as createIssueModule from '../src/github/createIssue';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'test-jwt'),
}));

describe('POST /tasks', () => {
  const FAKE_PRIVATE_KEY_B64 = Buffer.from('fake-key').toString('base64');
  const baseConfig = {
    port: 8080,
    githubAppId: '1234',
    githubWebhookSecret: 'webhook-secret',
    githubAppPrivateKey: FAKE_PRIVATE_KEY_B64,
  };

  beforeAll(() => {
    nock.disableNetConnect();
    process.env.RATE_LIMIT_MODE = 'internal';
  });

  afterAll(() => {
    nock.enableNetConnect();
    delete process.env.RATE_LIMIT_MODE;
  });

  afterEach(async () => {
    nock.cleanAll();
    resetInstallationCache();
    delete process.env.GITHUB_INSTALLATION_ID;
    delete process.env.GITHUB_APP_ID;
    delete process.env.GITHUB_APP_PRIVATE_KEY;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  function applyBaseEnv(): void {
    process.env.GITHUB_APP_ID = baseConfig.githubAppId;
    process.env.GITHUB_APP_PRIVATE_KEY = baseConfig.githubAppPrivateKey;
    process.env.GITHUB_WEBHOOK_SECRET = baseConfig.githubWebhookSecret;
  }

  test('valid input returns 201 with issue details', async () => {
    applyBaseEnv();
    process.env.GITHUB_INSTALLATION_ID = '456';

    const app = buildServer(baseConfig);

    const accessTokenScope = nock('https://api.github.com')
      .post('/app/installations/456/access_tokens')
      .reply(200, { token: 'installation-token' });

    const issueScope = nock('https://api.github.com')
      .post('/repos/example/repo/issues', (body: any) => {
        expect(body.title).toBe('[Agent Task] Add /version endpoint');
        expect(body.labels).toContain('ai-task');
        expect(body.body).toContain('## Objective');
        expect(body.body).toContain('ALLOWED_PATHS');
        return true;
      })
      .reply(201, { number: 42, html_url: 'https://github.com/example/repo/issues/42' });

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        owner: 'example',
        repo: 'repo',
        title: 'Add /version endpoint',
        objective: 'Add /version endpoint and expose in UI',
        constraints: {
          allowedPaths: ['services/api/**'],
          forbiddenPaths: ['infra/**'],
          timeCapMin: 30,
          costCapUSD: 1.5,
        },
        testSpec: ['Unit test for /version'],
        acceptance: ['All checks green'],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      issue_number: 42,
      issue_url: 'https://github.com/example/repo/issues/42',
    });

    expect(accessTokenScope.isDone()).toBe(true);
    expect(issueScope.isDone()).toBe(true);
    await app.close();
  });

  test('returns 400 when required field missing', async () => {
    applyBaseEnv();
    process.env.GITHUB_INSTALLATION_ID = '456';

    const app = buildServer(baseConfig);
    const response = await app.inject({ method: 'POST', url: '/tasks', payload: {} });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  test('adds ai-task label when not provided', async () => {
    applyBaseEnv();
    process.env.GITHUB_INSTALLATION_ID = '987';

    const app = buildServer(baseConfig);

    nock('https://api.github.com')
      .post('/app/installations/987/access_tokens')
      .reply(200, { token: 'installation-token' });

    const issueScope = nock('https://api.github.com')
      .post('/repos/example/repo/issues', (body: any) => {
        expect(body.labels).toEqual(['custom', 'ai-task']);
        return true;
      })
      .reply(201, { number: 7, html_url: 'https://github.com/example/repo/issues/7' });

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        owner: 'example',
        repo: 'repo',
        title: 'With labels',
        objective: 'Ensure label handling',
        labels: ['custom'],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(issueScope.isDone()).toBe(true);
    await app.close();
  });

  test('filters empty labels before creating issue', async () => {
    applyBaseEnv();
    process.env.GITHUB_INSTALLATION_ID = '321';

    const app = buildServer(baseConfig);

    nock('https://api.github.com')
      .post('/app/installations/321/access_tokens')
      .reply(200, { token: 'installation-token' });

    const issueScope = nock('https://api.github.com')
      .post('/repos/example/repo/issues', (body: any) => {
        expect(body.labels).toEqual(['ai-task']);
        return true;
      })
      .reply(201, { number: 8, html_url: 'https://github.com/example/repo/issues/8' });

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        owner: 'example',
        repo: 'repo',
        title: 'Trim labels',
        objective: 'Remove blank labels',
        labels: ['   ', ''],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(issueScope.isDone()).toBe(true);
    await app.close();
  });

  test('discovers installation id when env not set', async () => {
    applyBaseEnv();

    const app = buildServer(baseConfig);

    nock('https://api.github.com')
      .get('/app/installations')
      .reply(200, [
        { id: 1, account: { login: 'another' } },
        { id: 999, account: { login: 'example' } },
      ]);

    nock('https://api.github.com')
      .post('/app/installations/999/access_tokens')
      .reply(200, { token: 'installation-token' });

    const issueScope = nock('https://api.github.com')
      .post('/repos/example/repo/issues')
      .reply(201, { number: 55, html_url: 'https://github.com/example/repo/issues/55' });

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        owner: 'example',
        repo: 'repo',
        title: 'Discovery',
        objective: 'Find installation automatically',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(issueScope.isDone()).toBe(true);
    await app.close();
  });

  test('returns 502 when GitHub issue creation fails', async () => {
    applyBaseEnv();
    process.env.GITHUB_INSTALLATION_ID = '42';

    const app = buildServer(baseConfig);
    const createSpy = jest.spyOn(createIssueModule, 'createAgentIssue').mockRejectedValue(new Error('boom'));

    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: {
        owner: 'example',
        repo: 'repo',
        title: 'failure path',
        objective: 'simulate error',
      },
    });

    expect(response.statusCode).toBe(502);
    createSpy.mockRestore();
    await app.close();
  });
});
