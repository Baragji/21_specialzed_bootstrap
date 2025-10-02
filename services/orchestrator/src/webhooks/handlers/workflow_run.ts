import { addEvent, setCheck, setState, upsertTask } from '../../state/store';

export function handleWorkflowRunEvent(event: any) {
  const action = event.action as string;
  const wr = event.workflow_run;
  if (!wr) return;
  const name = wr.name as string; // should match required checks names
  const conclusion = wr.conclusion as string | undefined; // success or failure
  const head_branch = wr.head_branch as string | undefined;
  const repo = event.repository?.full_name as string;

  // Infer issue number from the head commit message PR title or branch name ref e.g., issue-<num>
  let issue_number: number | undefined;
  const title = wr.display_title as string | undefined;
  const msg = wr.head_commit?.message as string | undefined;
  const candidates = [title, msg, head_branch].filter(Boolean) as string[];
  for (const c of candidates) {
    const m = c.match(/#(\d+)/);
    if (m) { issue_number = Number(m[1]); break; }
  }
  if (!issue_number) return;

  const rec = upsertTask({ issue_number, repo });
  if (conclusion) {
    const ok = conclusion === 'success';
    setCheck(issue_number, name, ok);
    if (rec.checks.green) {
      setState(issue_number, 'CHECKS_GREEN');
    } else if (!ok) {
      setState(issue_number, 'CHECKS_RED');
    }
  }
  addEvent(issue_number, { ts: Date.now(), event: 'workflow_run', action, check_name: name, conclusion });
}
