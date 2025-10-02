import jwt from 'jsonwebtoken';

const GITHUB_API_BASE = 'https://api.github.com';
const USER_AGENT = 'orchestrator-service/1.0';

const installationCache = new Map<string, number>();

function decodePrivateKey(privateKeyB64: string): string {
  return Buffer.from(privateKeyB64, 'base64').toString('utf8');
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function buildAppJwt(appId: string, privateKeyB64: string): string {
  const privateKey = decodePrivateKey(privateKeyB64);
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      iat: now - 60,
      exp: now + 9 * 60,
      iss: appId,
    },
    privateKey,
    { algorithm: 'RS256' },
  );
}

export interface GitHubRequestOptions {
  token: string;
  method: string;
  url: string;
  body?: unknown;
}

export async function githubRequest<T = unknown>({ token, method, url, body }: GitHubRequestOptions): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${url}`, {
    method,
    headers: {
      Authorization: token,
      Accept: 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : (undefined as T);

  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in (data as Record<string, unknown>)
      ? (data as Record<string, unknown>).message
      : response.statusText;
    throw new Error(`GitHub request failed (${response.status}): ${String(message)}`);
  }

  return data;
}

export async function getInstallationId(owner: string): Promise<number> {
  const envInstallation = process.env.GITHUB_INSTALLATION_ID;
  if (envInstallation) {
    return Number(envInstallation);
  }

  const cacheKey = owner.toLowerCase();
  const cached = installationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const appId = getRequiredEnv('GITHUB_APP_ID');
  const privateKeyB64 = getRequiredEnv('GITHUB_APP_PRIVATE_KEY');
  const appJwt = buildAppJwt(appId, privateKeyB64);

  const installations = await githubRequest<Array<{ id: number; account?: { login?: string } }>>({
    token: `Bearer ${appJwt}`,
    method: 'GET',
    url: '/app/installations',
  });

  const match = installations.find((installation) => installation.account?.login?.toLowerCase() === cacheKey);
  if (!match) {
    throw new Error(`No GitHub App installation found for owner ${owner}`);
  }

  installationCache.set(cacheKey, match.id);
  return match.id;
}

export async function getInstallationToken(installationId: number): Promise<string> {
  const appId = getRequiredEnv('GITHUB_APP_ID');
  const privateKeyB64 = getRequiredEnv('GITHUB_APP_PRIVATE_KEY');
  const appJwt = buildAppJwt(appId, privateKeyB64);

  const data = await githubRequest<{ token: string }>({
    token: `Bearer ${appJwt}`,
    method: 'POST',
    url: `/app/installations/${installationId}/access_tokens`,
  });

  return data.token;
}

export async function getInstallationTokenForOwner(owner: string): Promise<string> {
  const installationId = await getInstallationId(owner);
  return getInstallationToken(installationId);
}

export function resetInstallationCache(): void {
  installationCache.clear();
}
