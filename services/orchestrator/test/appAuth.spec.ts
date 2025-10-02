import jwt from 'jsonwebtoken';

import {
  buildAppJwt,
  getInstallationId,
  getInstallationToken,
  getInstallationTokenForOwner,
  githubRequest,
  resetInstallationCache,
} from '../src/github/appAuth';

const TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDLkGukdxbYF9bL\nJCLw2DDdy0wW1XHlzTH0jzZMfjNV8iPBUFeCFGXFZ8iDSHPsuacF2nwLxgPLZld0\nGAbIYW/W2PASi6DPd7OJbRRqtD9h5pz50jdK4Zk90un0nLBKBPXn1HULICwhf66A\nUiP+6JGZveHFkNjEcNWef39/C4R2tQeM+c/fi91tIbp/BK+f5pFwchAuC8W9jAqX\n4V3hokW2N7DbStO2Qd6hw2yYB9H9n1tFoZT3zh0+BTtPlqvGjufH6G+jD/adJziW\nnwYDUQlQA5J31h5XBrYuvh6aGd6jjDWbe6nMoISHYqZ36V9zp1KimG++HjMATkUM\nyva2wbiJAgMBAAECggEABZJLdnOjFkMrDXLI4YAlnXrhIRbkIuWGHNirMRHkRkNv\n4QVWwtIg9Y9ycYzaO+VxDRKCVh0b07XHtcwPa5RWPLXnw0lPwQxzb62LF8oT+xVQ\nRCpsOSJyYwcmBHQYaWV7k/akdUSHh3DquynjUTduVdJN9WewtG/XAIN5e8wZsM+d\n5BgU984wgKLF6ig84yYI6FqdtYYdlcYNSeNBY0d5hDOGOQ2m30IZHuZOKhHvJ3C0\nFhF38sZ4N2VNivXzXcX4Jt9V7H5PHeTtNKgHdwNwp0UrEGouGZWlznImPi0tLxe3\n9idh+NEnNh4tW7x1YgnPZXoqBYwygJyI072QtdgQKQKBgQD9ufADG7n2AFD+a83H\nA7/geHTdcNZa2m30IZHuZOKhHvJ3C0FhF38sZ4N2VNivXzXcX4Jt9V7H5PHeTtNK\nUjTK1Z4VBPakiobP6KyHR+Y6z3n0JVpaz6RtZpmjHtkobaN6D+PfYZ7R6pujISiF\nIuDrPq3NbS1Ry6j3TDIrS9KuXwKBgQDMRfMPmMXxMvmP0xSg6u40qCMgfHdCqkfNN\nMfCVxYvBy06SnVAk0nnBYnCTsRmR271GGBqBPdZiZsaAJ+lZeXqIuAv89xDSHLhe\nbP4Jrped1IovnHgwlHGawEq+y3OC/YLXTr4Wr9PXgC7vRlQCk2BEm90Lk9R/+qvP\nnMt2rt7NmQKBgF99nmCaTKty+O+kO5OVwOB1p5MNDoAuCEi0aKBslZx2drXr/7EQ\n4X4jG3Ejj6+UeJ8V+RaH//RUW2KIiMzFxLpy0X58F3RrgPf63eNbUsVTNff7kwh2\nbesFiNUFDXL9uBeb5GsyhQOdE31x4n4t4tPcNI0YvrFica8tWHZcizxSAoGAdP42\n7OJHb+Jseb3CidRubc4QpfAlWTMwVzKhI1+w4n1vCtbmZh9rqx8pFazc2DSES0M1\nxXGr0C+MEY0S8NxV+4CSkiqhSSjMBDuNIQP5CKEM5Qn2ATqNnS/xP8s3HdWu3UwG\nXPx8pFazc2DSES0M1xXGr0C+MEY0S8NxV+4CSkiqhSECgYEAvYXgkxWh05rq6Arl\ncocTyBC0bY4Z1cdq9VHtV6nRvWmvMRGsiE9zraFMvx6bMpiKFFitvolG/GpNZgbC\n5e0MyoVo9hw3rroWAtxEvsC0BpvyOukgqS0bkkCm1cW0XkyR3O6jwxKF1u9IiMaB\nDqizu0r2jcWcN6iYG3PaY5E9O+8=\n-----END PRIVATE KEY-----`;

const TEST_PRIVATE_KEY_B64 = Buffer.from(TEST_PRIVATE_KEY).toString('base64');

const originalFetch = global.fetch;

beforeEach(() => {
  resetInstallationCache();
  jest.spyOn(jwt, 'sign').mockImplementation(() => 'test-jwt' as any);
});

afterEach(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  delete process.env.GITHUB_APP_ID;
  delete process.env.GITHUB_APP_PRIVATE_KEY;
  delete process.env.GITHUB_INSTALLATION_ID;
  delete process.env.GITHUB_WEBHOOK_SECRET;
  jest.restoreAllMocks();
  resetInstallationCache();
});

describe('buildAppJwt', () => {
  test('creates a JWT string', () => {
    const jwtToken = buildAppJwt('1234', TEST_PRIVATE_KEY_B64);
    expect(typeof jwtToken).toBe('string');
    expect(jwtToken).toBe('test-jwt');
  });
});

describe('githubRequest', () => {
  test('returns JSON on success', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
      statusText: 'OK',
    })) as unknown as typeof fetch;

    const response = await githubRequest<{ ok: boolean }>({
      token: 'Bearer test',
      method: 'GET',
      url: '/ping',
    });

    expect(response.ok).toBe(true);
    expect((global.fetch as unknown as jest.Mock).mock.calls[0][1]?.headers?.Authorization).toBe('Bearer test');
  });

  test('returns undefined on 204 responses', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 204,
      text: async () => '',
      statusText: 'No Content',
    })) as unknown as typeof fetch;

    const result = await githubRequest<{ ok: boolean }>({
      token: 'Bearer test',
      method: 'DELETE',
      url: '/ping',
    });

    expect(result).toBeUndefined();
  });

  test('throws on GitHub error', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ message: 'Not Found' }),
      statusText: 'Not Found',
    })) as unknown as typeof fetch;

    await expect(
      githubRequest({ token: 'Bearer test', method: 'GET', url: '/missing' }),
    ).rejects.toThrow('GitHub request failed (404): Not Found');
  });

  test('uses status text when error response has no body', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => '',
      statusText: 'Internal Server Error',
    })) as unknown as typeof fetch;

    await expect(
      githubRequest({ token: 'Bearer test', method: 'GET', url: '/missing' }),
    ).rejects.toThrow('GitHub request failed (500): Internal Server Error');
  });
});

describe('installation helpers', () => {
  test('returns installation id from environment variable', async () => {
    process.env.GITHUB_INSTALLATION_ID = '321';
    const value = await getInstallationId('any');
    expect(value).toBe(321);
  });

  test('fetches installation id when not cached', async () => {
    process.env.GITHUB_APP_ID = '1234';
    process.env.GITHUB_APP_PRIVATE_KEY = TEST_PRIVATE_KEY_B64;

    const fetchMock = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 999, account: { login: 'example' } }]),
      statusText: 'OK',
    })) as unknown as typeof fetch;

    global.fetch = fetchMock;

    const id = await getInstallationId('example');
    expect(id).toBe(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await getInstallationId('example');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('throws when installation not found', async () => {
    process.env.GITHUB_APP_ID = '1234';
    process.env.GITHUB_APP_PRIVATE_KEY = TEST_PRIVATE_KEY_B64;

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify([{ id: 1, account: { login: 'other' } }]),
      statusText: 'OK',
    })) as unknown as typeof fetch;

    await expect(getInstallationId('example')).rejects.toThrow('No GitHub App installation found for owner example');
  });

  test('creates access token for installation', async () => {
    process.env.GITHUB_APP_ID = '1234';
    process.env.GITHUB_APP_PRIVATE_KEY = TEST_PRIVATE_KEY_B64;

    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ token: 'installation-token' }),
      statusText: 'OK',
    })) as unknown as typeof fetch;

    const token = await getInstallationToken(999);
    expect(token).toBe('installation-token');
  });

  test('getInstallationTokenForOwner uses discovery', async () => {
    process.env.GITHUB_APP_ID = '1234';
    process.env.GITHUB_APP_PRIVATE_KEY = TEST_PRIVATE_KEY_B64;

    const calls: Array<{ url: string }> = [];

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push({ url });
      if (url.endsWith('/app/installations')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify([{ id: 777, account: { login: 'example' } }]),
          statusText: 'OK',
        } as any;
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ token: 'installation-token' }),
        statusText: 'OK',
      } as any;
    }) as unknown as typeof fetch;

    const token = await getInstallationTokenForOwner('example');
    expect(token).toBe('installation-token');
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.github.com/app/installations',
      'https://api.github.com/app/installations/777/access_tokens',
    ]);
  });

  test('throws when required env missing for installation token', async () => {
    delete process.env.GITHUB_APP_ID;
    process.env.GITHUB_APP_PRIVATE_KEY = TEST_PRIVATE_KEY_B64;

    await expect(getInstallationToken(1)).rejects.toThrow('GITHUB_APP_ID is required');
  });
});
