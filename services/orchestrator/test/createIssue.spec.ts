import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as appAuth from '../src/github/appAuth';

jest.mock('../src/github/appAuth', () => {
  return {
    getInstallationTokenForOwner: jest.fn(async () => 'itoken'),
    githubRequest: jest.fn(async (_opts: any) => ({ number: 123, html_url: 'https://example.com/ok' })),
  };
});

describe('createIssue helpers via createAgentIssue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers html_url when present', async () => {
    const { createAgentIssue } = await import('../src/github/createIssue');
    (appAuth.githubRequest as unknown as any).mockResolvedValueOnce({ number: 7, html_url: 'https://github.com/x/y/issues/7' });
    const res = await createAgentIssue({ owner: 'x', repo: 'y', title: 't', objective: 'o' });
    expect(res.issueUrl).toBe('https://github.com/x/y/issues/7');
  });

  it('falls back to url when html_url is missing', async () => {
    const { createAgentIssue } = await import('../src/github/createIssue');
    (appAuth.githubRequest as unknown as any).mockResolvedValueOnce({ number: 8, url: 'https://api.github.com/repos/x/y/issues/8' });
    const res = await createAgentIssue({ owner: 'x', repo: 'y', title: 't', objective: 'o' });
    expect(res.issueUrl).toBe('https://api.github.com/repos/x/y/issues/8');
  });

  it('constructs default url when neither html_url nor url provided', async () => {
    const { createAgentIssue } = await import('../src/github/createIssue');
    (appAuth.githubRequest as unknown as any).mockResolvedValueOnce({ number: 9 });
    const res = await createAgentIssue({ owner: 'x', repo: 'y', title: 't', objective: 'o' });
    expect(res.issueUrl).toBe('https://github.com/x/y/issues/9');
  });

  it('ensures ai-task label uniqueness and renders empty constraints as placeholder', async () => {
    const { createAgentIssue } = await import('../src/github/createIssue');
    const spy = appAuth.githubRequest as unknown as any;
    spy.mockResolvedValueOnce({ number: 10, html_url: 'https://example.com/ok' });
    await createAgentIssue({ owner: 'o', repo: 'r', title: 't', objective: 'o', labels: ['ai-task'] });
    const call = spy.mock.calls[0][0];
    expect(call.body.labels.filter((l: string) => l === 'ai-task').length).toBe(1);
    const body: string = call.body.body as string;
    expect(body).toContain('ALLOWED_PATHS:');
    expect(body).toContain('FORBIDDEN_PATHS:');
    // placeholders should appear as '  -' when arrays are empty/undefined
    expect(body.split('\n').some((l) => l.trim() === '-')).toBe(true);
  });

  it('renders provided constraints and checklists into body', async () => {
    const { createAgentIssue } = await import('../src/github/createIssue');
    const spy = appAuth.githubRequest as unknown as any;
    spy.mockResolvedValueOnce({ number: 11, html_url: 'https://example.com/ok' });
    await createAgentIssue({
      owner: 'o', repo: 'r', title: 't', objective: 'o',
      constraints: { allowedPaths: ['src/'], forbiddenPaths: ['secrets/'], timeCapMin: 30, costCapUSD: 5 },
      testSpec: ['unit passes'], acceptance: ['deployed'], labels: ['enhancement']
    });
    const call = spy.mock.calls[0][0];
    const body: string = call.body.body as string;
    expect(body).toContain('ALLOWED_PATHS:');
    expect(body).toContain('  - src/');
    expect(body).toContain('FORBIDDEN_PATHS:');
    expect(body).toContain('  - secrets/');
    expect(body).toContain('TIME_CAP_MIN: 30');
    expect(body).toContain('COST_CAP_USD: 5');
    expect(body).toContain('Test expectations');
    expect(body).toContain('- unit passes');
    expect(body).toContain('Acceptance criteria');
    expect(body).toContain('- deployed');
  });
});
