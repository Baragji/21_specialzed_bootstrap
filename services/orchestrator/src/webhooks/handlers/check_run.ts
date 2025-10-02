import { addEvent, setCheck, setState, upsertTask } from '../../state/store';

export function handleCheckRunEvent(event: any) {
  const action = event.action as string;
  const check = event.check_run;
  if (!check) return;
  const name = check.name as string;
  const conclusion = check.conclusion as string | undefined; // success, failure, neutral, cancelled, etc.

  // Try to infer issue number from pull requests associated with the check
  const pr = (check.pull_requests && check.pull_requests[0]) || undefined;
  const pr_number = pr?.number as number | undefined;
  const repo = event.repository?.full_name as string;

  // Best effort: parse issue number referenced in PR title/body
  let issue_number: number | undefined;
  if (pr && pr.title) {
    const m = pr.title.match(/#(\d+)/);
    if (m) issue_number = Number(m[1]);
  }

  if (!issue_number && pr && pr.body) {
    const m = pr.body.match(/#(\d+)/);
    if (m) issue_number = Number(m[1]);
  }

  if (!issue_number) {
    // no-op without issue linkage
    return;
  }

  const rec = upsertTask({ issue_number, repo });

  if (conclusion) {
    const ok = conclusion === 'success';
    setCheck(issue_number, name, ok);
    if (rec.checks.green) {
      setState(issue_number, 'CHECKS_GREEN');
    } else if (conclusion === 'failure' || conclusion === 'cancelled' || conclusion === 'timed_out') {
      setState(issue_number, 'CHECKS_RED');
    }
  }

  addEvent(issue_number, { ts: Date.now(), event: 'check_run', action, check_name: name, conclusion });
}
