import { getInstallationTokenForOwner, githubRequest } from './appAuth';

type ConstraintList = string[] | undefined;

type TaskConstraints = {
  allowedPaths?: string[];
  forbiddenPaths?: string[];
  timeCapMin?: number;
  costCapUSD?: number;
};

export interface AgentIssueInput {
  owner: string;
  repo: string;
  title: string;
  objective: string;
  constraints?: TaskConstraints;
  testSpec?: string[];
  acceptance?: string[];
  labels?: string[];
}

export interface AgentIssueResult {
  issueNumber: number;
  issueUrl: string;
}

function uniqueLabels(labels: string[] | undefined): string[] {
  const merged = new Set(labels ?? []);
  merged.add('ai-task');
  return Array.from(merged);
}

function renderList(title: string, items: ConstraintList): string[] {
  const lines: string[] = [`${title}:`];
  if (!items || items.length === 0) {
    lines.push('  -');
    return lines;
  }
  for (const item of items) {
    lines.push(`  - ${item}`);
  }
  return lines;
}

function renderConstraints(constraints: TaskConstraints | undefined): string {
  const allowed = renderList('ALLOWED_PATHS', constraints?.allowedPaths);
  const forbidden = renderList('FORBIDDEN_PATHS', constraints?.forbiddenPaths);
  const timeCap = `TIME_CAP_MIN: ${constraints?.timeCapMin ?? 0}`;
  const costCap = `COST_CAP_USD: ${constraints?.costCapUSD ?? 0}`;

  return ['```yaml', ...allowed, ...forbidden, timeCap, costCap, '```'].join('\n');
}

function renderChecklist(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return '- (not specified)';
  }
  return items.map((item) => `- ${item}`).join('\n');
}

function buildIssueBody(input: AgentIssueInput): string {
  return [
    '## Objective',
    input.objective,
    '',
    '## Constraints',
    renderConstraints(input.constraints),
    '',
    '## Test expectations',
    renderChecklist(input.testSpec),
    '',
    '## Acceptance criteria',
    renderChecklist(input.acceptance),
    '',
    '## Notes',
    '- Assign to **Copilot – Coding Agent** via GitHub UI if not auto-assigned by label.',
    '- This issue was created by the Orchestrator.',
  ].join('\n');
}

export async function createAgentIssue(input: AgentIssueInput): Promise<AgentIssueResult> {
  const labels = uniqueLabels(input.labels);
  const body = buildIssueBody(input);

  const installationToken = await getInstallationTokenForOwner(input.owner);

  const issueResponse = await githubRequest<{ number: number; html_url?: string; url?: string }>({
    token: `token ${installationToken}`,
    method: 'POST',
    url: `/repos/${input.owner}/${input.repo}/issues`,
    body: {
      title: `[Agent Task] ${input.title}`,
      labels,
      body,
    },
  });

  return {
    issueNumber: issueResponse.number,
    issueUrl: issueResponse.html_url ?? issueResponse.url ?? `https://github.com/${input.owner}/${input.repo}/issues/${issueResponse.number}`,
  };
}
