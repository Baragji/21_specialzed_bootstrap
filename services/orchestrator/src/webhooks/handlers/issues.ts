import { addEvent, setState, upsertTask } from '../../state/store';

export function handleIssuesEvent(event: any) {
  const action = event.action as string;
  const issue = event.issue;
  if (!issue) return;
  const issue_number = issue.number as number;
  const repo = event.repository?.full_name as string;

  upsertTask({ issue_number, repo });

  // CREATED when issue opened with ai-task label
  if (action === 'opened') {
    const labels: string[] = (issue.labels || []).map((l: any) => l.name);
    if (labels.includes('ai-task')) {
      setState(issue_number, 'CREATED');
    }
  }

  if (action === 'closed') {
    if (issue.pull_request && issue.pull_request.merged) {
      setState(issue_number, 'MERGED');
    } else {
      setState(issue_number, 'FAILED');
    }
  }

  addEvent(issue_number, { ts: Date.now(), event: 'issues', action });
}
