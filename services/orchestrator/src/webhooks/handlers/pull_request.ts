import { addEvent, setPr, setState, upsertTask } from '../../state/store';

export function handlePullRequestEvent(event: any) {
  const action = event.action as string;
  const pr = event.pull_request;
  if (!pr) return;
  const pr_number = pr.number as number;
  const repo = event.repository?.full_name as string;

  // Derive issue number from PR title or body references if present; fallback to PR number as surrogate
  const refFrom = (str?: string): number | undefined => {
    if (!str) return undefined;
    const m = str.match(/#(\d+)/);
    return m ? Number(m[1]) : undefined;
  };
  const linkedFromTitle = refFrom(pr.title);
  const linkedFromBody = refFrom(pr.body);
  const issue_number: number = linkedFromTitle ?? linkedFromBody ?? pr_number;

  upsertTask({ issue_number, repo });
  setPr(issue_number, pr_number);

  if (action === 'opened' || action === 'synchronize' || action === 'ready_for_review') {
    setState(issue_number, 'PR_OPEN');
  }

  if (action === 'closed') {
    if (pr.merged) {
      setState(issue_number, 'MERGED');
    } else {
      setState(issue_number, 'FAILED');
    }
  }

  addEvent(issue_number, { ts: Date.now(), event: 'pull_request', action, pr_number });
}
