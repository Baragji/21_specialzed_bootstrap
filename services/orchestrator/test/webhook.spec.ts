import crypto from 'crypto';
import { spawnSync } from 'child_process';
import path from 'path';

import {
  buildServer,
  buildWebhookLogPayload,
  createRateLimiter,
  extractRawBody,
  firstHeaderValue,
  loadConfigFromEnv,
  RequestForExtraction,
  rateLimitErrorResponse,
  resolveTimeWindowMs,
  startRuntime,
} from '../src/server';
import { AppConfig } from '../src/types';

process.env.LOG_LEVEL = 'fatal';

const secret = 'super-secret';
const baseConfig: AppConfig = {
  port: 8080,
  githubAppId: '12345',
  githubWebhookSecret: secret,
  githubAppPrivateKey: Buffer.from('fake-key').toString('base64'),
};

function makeSignature(body: string, key: string): string {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(body);
  return `sha256=${hmac.digest('hex')}`;
}

describe('orchestrator webhook', () => {
  const servers: Array<ReturnType<typeof buildServer>> = [];
  const originalRateLimitMode = process.env.RATE_LIMIT_MODE;

  beforeAll(() => {
    process.env.RATE_LIMIT_MODE = 'internal';
  });

  afterAll(() => {
    process.env.RATE_LIMIT_MODE = originalRateLimitMode;
  });

  afterEach(async () => {
    while (servers.length) {
      const server = servers.pop();
      if (server) {
        await server.close();
      }
    }
  });

  test('health endpoint responds with ok', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const response = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  test('valid signature is accepted', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = JSON.stringify({ repository: { full_name: 'example/repo' } });
    const signature = makeSignature(payload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'issues',
        'x-github-delivery': 'delivery-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'received' });
  });

  test('logger respects LOG_LEVEL override', async () => {
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'debug';
    try {
      const app = buildServer(baseConfig);
      servers.push(app);
      expect(app.log.level).toBe('debug');
    } finally {
      process.env.LOG_LEVEL = originalLevel;
    }
  });

  test('logger falls back to info when LOG_LEVEL empty', async () => {
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = '   ';
    try {
      const app = buildServer(baseConfig);
      servers.push(app);
      expect(app.log.level).toBe('info');
    } finally {
      process.env.LOG_LEVEL = originalLevel;
    }
  });

  test('logger defaults to info when LOG_LEVEL undefined', async () => {
    const originalLevel = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
    try {
      const app = buildServer(baseConfig);
      servers.push(app);
      expect(app.log.level).toBe('info');
    } finally {
      if (originalLevel === undefined) {
        delete process.env.LOG_LEVEL;
      } else {
        process.env.LOG_LEVEL = originalLevel;
      }
    }
  });

  test('structured log only includes summary fields', async () => {
    const originalLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'info';
    try {
      const app = buildServer(baseConfig);
      servers.push(app);

      const payload = JSON.stringify({ repository: { full_name: 'example/repo' }, secret: 'keep-me' });
      const signature = makeSignature(payload, secret);
      let requestInfoSpy: jest.SpyInstance | undefined;
      app.addHook('onRequest', (req, _reply, done) => {
        requestInfoSpy = jest.spyOn(req.log, 'info');
        done();
      });

      await app.inject({
        method: 'POST',
        url: '/webhooks/github',
        payload,
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
          'x-github-event': 'issues',
          'x-github-delivery': 'delivery-log',
        },
      });

      const logCall = requestInfoSpy?.mock.calls.find((call) => Boolean((call[0] as any)?.webhook));
      expect(logCall).toBeDefined();
      const logged = logCall?.[0] as { webhook?: { event: string; repo: string; deliveryId: string } } | undefined;
      expect(logged?.webhook).toEqual({ event: 'issues', repo: 'example/repo', deliveryId: 'delivery-log' });
      expect(JSON.stringify(logged)).not.toContain('keep-me');
    } finally {
      process.env.LOG_LEVEL = originalLevel;
    }
  });

  test('unknown event value still returns 200', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = JSON.stringify({ repository: { full_name: 'example/repo' } });
    const signature = makeSignature(payload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'custom_event',
        'x-github-delivery': 'delivery-unknown',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'received' });
  });

  test('exceeding rate limit returns 429', async () => {
    const app = buildServer({
      ...baseConfig,
      rateLimit: { max: 2, timeWindow: '1 second' },
    });
    servers.push(app);

    const payload = JSON.stringify({ repository: { full_name: 'example/repo' } });
    const signature = makeSignature(payload, secret);
    const headers = {
      'content-type': 'application/json',
      'x-hub-signature-256': signature,
      'x-github-event': 'issues',
      'x-github-delivery': 'rate-limit-test',
    };

    const first = await app.inject({ method: 'POST', url: '/webhooks/github', payload, headers });
    const second = await app.inject({ method: 'POST', url: '/webhooks/github', payload, headers });
    const third = await app.inject({ method: 'POST', url: '/webhooks/github', payload, headers });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
    expect(third.json()).toEqual({ status: 'rate_limited' });
  });

  test('missing signature header is rejected', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = JSON.stringify({});

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issues',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: 'invalid signature' });
  });

  test('unsupported signature scheme is rejected', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = JSON.stringify({});
    const signature = makeSignature(payload, secret).replace('sha256=', 'sha1=');

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'issues',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: 'invalid signature' });
  });

  test('mismatched signature is rejected', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = JSON.stringify({});

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': 'sha256=deadbeef',
        'x-github-event': 'issues',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: 'invalid signature' });
  });


  test('array-valued headers are normalised', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = JSON.stringify({ repository: { full_name: 'example/repo' } });
    const signature = makeSignature(payload, secret);

    app.addHook('onRequest', (req, _reply, done) => {
      req.headers['x-hub-signature-256'] = [signature] as any;
      req.headers['x-github-event'] = ['issues'] as any;
      req.headers['x-github-delivery'] = ['array-delivery'] as any;
      done();
    });

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'issues',
        'x-github-delivery': 'array-delivery',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'received' });
  });

  test('internal rate limiter toggles based on RATE_LIMIT_MODE', async () => {
    process.env.RATE_LIMIT_MODE = 'internal';
    const internalApp = buildServer(baseConfig);
    servers.push(internalApp);
    expect((internalApp as any).orchestratorInternalLimiter).toBe(true);
  });

  test('route-level rate limit configuration honours environment overrides', async () => {
    const previousMode = process.env.RATE_LIMIT_MODE;
    const previousMax = process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_MODE;
    process.env.RATE_LIMIT_MAX = '2';

    try {
      const app = buildServer(baseConfig);
      servers.push(app);

      await app.ready();

      const routeConfig = (app as any).orchestratorRateLimit;
      expect(routeConfig?.max).toBe(2);
      expect(routeConfig?.timeWindow).toBe(resolveTimeWindowMs('1 minute'));
      expect((app as any).orchestratorInternalLimiter).toBe(false);
    } finally {
      if (previousMode === undefined) {
        delete process.env.RATE_LIMIT_MODE;
      } else {
        process.env.RATE_LIMIT_MODE = previousMode;
      }

      if (previousMax === undefined) {
        delete process.env.RATE_LIMIT_MAX;
      } else {
        process.env.RATE_LIMIT_MAX = previousMax;
      }
    }
  });

  test('empty payload passes signature validation', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = '';
    const signature = makeSignature(payload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'issues',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'received' });
  });

  test('non-json content falls back to body serialization and is rejected when signature mismatches', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const payload = 'plain text';
    const signature = makeSignature(payload, secret);

    const accepted = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'text/plain',
        'x-hub-signature-256': signature,
        'x-github-event': 'issues',
      },
    });
    expect(accepted.statusCode).toBe(200);

    const rejected = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'text/plain',
        'x-hub-signature-256': 'sha256=deadbeef',
        'x-github-event': 'issues',
      },
    });

    expect(rejected.statusCode).toBe(401);
  });

  test('missing event header returns 400', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const jsonPayload = JSON.stringify({});
    const signature = makeSignature(jsonPayload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: jsonPayload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: 'missing event header' });
  });

  test('empty event header returns 400', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const jsonPayload = JSON.stringify({});
    const signature = makeSignature(jsonPayload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: jsonPayload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': '   ',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: 'missing event header' });
  });

  test('empty event header returns 400', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const jsonPayload = JSON.stringify({});
    const signature = makeSignature(jsonPayload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: jsonPayload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': '   ',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: 'missing event header' });
  });

  test('invalid JSON body returns a 400 error', async () => {
    const app = buildServer(baseConfig);
    servers.push(app);

    const badPayload = '{';
    const signature = makeSignature(badPayload, secret);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: badPayload,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': signature,
        'x-github-event': 'issues',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: 'invalid payload' });
  });

  test('rate limit response helper returns a consistent payload', () => {
    expect(rateLimitErrorResponse()).toEqual({ status: 'rate_limited' });
  });
});

describe('loadConfigFromEnv', () => {
  test('throws when webhook secret missing', () => {
    expect(() => loadConfigFromEnv({} as NodeJS.ProcessEnv)).toThrow('GITHUB_WEBHOOK_SECRET is required');
  });

  test('throws when app id missing', () => {
    expect(() =>
      loadConfigFromEnv({ GITHUB_WEBHOOK_SECRET: 'secret' } as NodeJS.ProcessEnv),
    ).toThrow('GITHUB_APP_ID is required');
  });

  test('throws when private key missing', () => {
    expect(() =>
      loadConfigFromEnv({ GITHUB_WEBHOOK_SECRET: 'secret', GITHUB_APP_ID: '42' } as NodeJS.ProcessEnv),
    ).toThrow('GITHUB_APP_PRIVATE_KEY is required');
  });

  test('builds config with defaults', () => {
    const config = loadConfigFromEnv({
      PORT: '9090',
      GITHUB_WEBHOOK_SECRET: 'secret',
      GITHUB_APP_ID: '42',
      GITHUB_APP_PRIVATE_KEY: 'base64-key',
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      port: 9090,
      githubWebhookSecret: 'secret',
      githubAppId: '42',
      githubAppPrivateKey: 'base64-key',
    });
  });

  test('loadConfigFromEnv can read from process.env when args omitted', () => {
    const original = {
      PORT: process.env.PORT,
      GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
      GITHUB_APP_ID: process.env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
    };
    process.env.PORT = '1234';
    process.env.GITHUB_WEBHOOK_SECRET = 'env-secret';
    process.env.GITHUB_APP_ID = 'env-app';
    process.env.GITHUB_APP_PRIVATE_KEY = 'env-key';

    try {
      const config = loadConfigFromEnv();
      expect(config).toEqual({
        port: 1234,
        githubWebhookSecret: 'env-secret',
        githubAppId: 'env-app',
        githubAppPrivateKey: 'env-key',
      });
    } finally {
      process.env.PORT = original.PORT;
      process.env.GITHUB_WEBHOOK_SECRET = original.GITHUB_WEBHOOK_SECRET;
      process.env.GITHUB_APP_ID = original.GITHUB_APP_ID;
      process.env.GITHUB_APP_PRIVATE_KEY = original.GITHUB_APP_PRIVATE_KEY;
    }
  });
});

describe('helpers', () => {
  test('extractRawBody handles strings and JSON', () => {
    const request: RequestForExtraction = { rawBody: 'abc' };
    expect(extractRawBody(request)).toBe('abc');

    const stringBody: RequestForExtraction = { body: 'text' };
    expect(extractRawBody(stringBody)).toBe('text');

    const jsonBody: RequestForExtraction = { body: { count: 1 } };
    expect(extractRawBody(jsonBody)).toBe(JSON.stringify({ count: 1 }));

    expect(extractRawBody({})).toBe('');
  });

  test('extractRawBody falls back to empty string on serialization failure', () => {
    const circular: any = {};
    circular.self = circular;
    expect(extractRawBody({ body: circular })).toBe('');
  });

  test('buildWebhookLogPayload derives repository name and defaults', () => {
    const payload = buildWebhookLogPayload('issues', 'delivery-3', {
      repository: { full_name: 'owner/repo' },
    });
    expect(payload).toEqual({ event: 'issues', deliveryId: 'delivery-3', repo: 'owner/repo' });

    const fallback = buildWebhookLogPayload('push', 'delivery-4', {});
    expect(fallback).toEqual({ event: 'push', deliveryId: 'delivery-4', repo: 'unknown' });
  });

  test('firstHeaderValue normalises arrays and strings', () => {
    expect(firstHeaderValue(['one', 'two'])).toBe('one');
    expect(firstHeaderValue('value')).toBe('value');
    expect(firstHeaderValue(undefined)).toBeUndefined();
  });
});

describe('rate limiter internals', () => {
  test('resolveTimeWindowMs covers supported formats', () => {
    expect(resolveTimeWindowMs(250)).toBe(250);
    expect(resolveTimeWindowMs('4000')).toBe(4000);
    expect(resolveTimeWindowMs('250 ms')).toBe(250);
    expect(resolveTimeWindowMs('1.5 seconds')).toBe(1500);
    expect(resolveTimeWindowMs('2 minutes')).toBe(120000);
    expect(resolveTimeWindowMs('5 millisecond')).toBe(5);
    expect(resolveTimeWindowMs('6 milliseconds')).toBe(6);
    expect(resolveTimeWindowMs('3 sec')).toBe(3000);
    expect(resolveTimeWindowMs('4 second')).toBe(4000);
    expect(resolveTimeWindowMs('5 seconds')).toBe(5000);
    expect(resolveTimeWindowMs('2 m')).toBe(120000);
    expect(resolveTimeWindowMs('3 min')).toBe(180000);
    expect(resolveTimeWindowMs('1 minute')).toBe(60000);
    expect(resolveTimeWindowMs('1 fortnight')).toBe(60000);
    expect(resolveTimeWindowMs('unexpected')).toBe(60000);
  });

  test('createRateLimiter enforces limit and resets after window', () => {
    const limiter = createRateLimiter({ max: 2, timeWindow: '1 second' });
    const request = { ip: '127.0.0.1' } as any;
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(0);
    expect(limiter(request)).toBe(true);
    expect(limiter(request)).toBe(true);
    expect(limiter(request)).toBe(false);

    nowSpy.mockReturnValue(1500);
    expect(limiter(request)).toBe(true);

    nowSpy.mockRestore();
  });

  test('createRateLimiter clamps invalid max and handles unknown ip', () => {
    const limiter = createRateLimiter({ max: 0, timeWindow: '500' });
    const request = {} as any;
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);

    expect(limiter(request)).toBe(true);
    expect(limiter(request)).toBe(false);

    nowSpy.mockRestore();
  });

  test('createRateLimiter resets counters after window using fake timers', () => {
    jest.useFakeTimers();
    try {
      const windowMs = resolveTimeWindowMs('750 ms');
      jest.setSystemTime(0);
      const limiter = createRateLimiter({ max: 2, timeWindow: '750 ms' });
      const request = { ip: '10.0.0.1' } as any;

      expect(limiter(request)).toBe(true);
      expect(limiter(request)).toBe(true);
      expect(limiter(request)).toBe(false);

      jest.advanceTimersByTime(windowMs);
      expect(limiter(request)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('startRuntime', () => {
  test('logs and exits when configuration fails', async () => {
    let exitCode: number | undefined;
    const exitFn = (code?: number) => {
      exitCode = code;
    };
    const errors: Array<unknown[]> = [];
    const logger = (...args: unknown[]) => {
      errors.push(args);
    };

    await startRuntime({} as NodeJS.ProcessEnv, exitFn, logger);

    expect(exitCode).toBe(1);
    const failureLog = errors.find((entry) => entry[0] === 'Failed to start orchestrator service:');
    expect(failureLog).toBeDefined();
  });

  test('listens on the configured port when configuration succeeds', async () => {
    const exitFn = jest.fn();
    const logger = jest.fn();
    const listenMock = jest.fn().mockResolvedValue(undefined);

    const testEnv: NodeJS.ProcessEnv = {
      PORT: '3333',
      GITHUB_WEBHOOK_SECRET: 'secret',
      GITHUB_APP_ID: '777',
      GITHUB_APP_PRIVATE_KEY: Buffer.from('key').toString('base64'),
    };
    const expectedConfig = loadConfigFromEnv(testEnv);

    const factory = jest.fn().mockReturnValue({ listen: listenMock } as unknown as ReturnType<typeof buildServer>);

    await startRuntime(testEnv, exitFn, logger, factory);

    expect(factory).toHaveBeenCalledWith(expectedConfig);
    expect(listenMock).toHaveBeenCalledWith({ port: expectedConfig.port, host: '0.0.0.0' });
    expect(exitFn).not.toHaveBeenCalled();
    expect(logger).not.toHaveBeenCalled();
  });

  test('startRuntime falls back to defaults when optional parameters omitted', async () => {
    const listenMock = jest.fn().mockResolvedValue(undefined);
    const factory = jest
      .fn()
      .mockReturnValue({ listen: listenMock } as unknown as ReturnType<typeof buildServer>);

    const testEnv: NodeJS.ProcessEnv = {
      GITHUB_WEBHOOK_SECRET: 'secret',
      GITHUB_APP_ID: '999',
      GITHUB_APP_PRIVATE_KEY: Buffer.from('key').toString('base64'),
    };

    await startRuntime(testEnv, undefined, undefined, factory);

    expect(factory).toHaveBeenCalled();
    expect(listenMock).toHaveBeenCalledWith({ port: 8080, host: '0.0.0.0' });
  });

  test('bootstrap exits with non-zero status when env is incomplete', () => {
    const scriptPath = path.resolve(__dirname, '..', 'src', 'server.ts');
    const tsNodeRegister = path.resolve(__dirname, '..', 'node_modules', 'ts-node', 'register');
    const env = { ...process.env } as NodeJS.ProcessEnv;
    delete env.GITHUB_WEBHOOK_SECRET;
    delete env.GITHUB_APP_ID;
    delete env.GITHUB_APP_PRIVATE_KEY;
    const result = spawnSync(
      process.execPath,
      ['-r', tsNodeRegister, scriptPath],
      {
        cwd: path.resolve(__dirname, '..'),
        env,
        encoding: 'utf8',
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Failed to start orchestrator service:');
  });
});
