import { upsertTask, getTask, setState, setPr, setCheck, REQUIRED_CHECKS } from '../src/state/store';
import { handleIssuesEvent } from '../src/webhooks/handlers/issues';
import { handlePullRequestEvent } from '../src/webhooks/handlers/pull_request';
import { handleCheckRunEvent } from '../src/webhooks/handlers/check_run';
import { handleWorkflowRunEvent } from '../src/webhooks/handlers/workflow_run';

describe('state store + handlers', () => {
  it('upsert and read task', () => {
    const t = upsertTask({ issue_number: 1, repo: 'acme/repo' });
    expect(t.issue_number).toBe(1);
    expect(getTask(1)?.repo).toBe('acme/repo');
  });

  it('set state and pr and checks', () => {
    upsertTask({ issue_number: 2, repo: 'acme/repo' });
    setState(2, 'IN_PROGRESS');
    setPr(2, 99);
    setCheck(2, REQUIRED_CHECKS[0], true);
    const t = getTask(2)!;
    expect(t.state).toBe('IN_PROGRESS');
    expect(t.pr_number).toBe(99);
    expect(t.checks.completed[REQUIRED_CHECKS[0]]).toBe(true);
  });

  it('issues closed without merge → FAILED', () => {
    handleIssuesEvent({ action: 'opened', issue: { number: 3, labels: [{ name: 'ai-task' }] }, repository: { full_name: 'acme/repo' } });
    handleIssuesEvent({ action: 'closed', issue: { number: 3, pull_request: { merged: false } }, repository: { full_name: 'acme/repo' } });
    expect(getTask(3)?.state).toBe('FAILED');
  });

  it('pull_request closed merged → MERGED', () => {
    handlePullRequestEvent({ action: 'opened', pull_request: { number: 10, title: 'Relates #4' }, repository: { full_name: 'acme/repo' } });
    handlePullRequestEvent({ action: 'closed', pull_request: { number: 10, merged: true, title: 'Relates #4' }, repository: { full_name: 'acme/repo' } });
    expect(getTask(4)?.state).toBe('MERGED');
  });

  it('check_run failure marks CHECKS_RED', () => {
    // Pretend PR 20 body links #5
    handlePullRequestEvent({ action: 'opened', pull_request: { number: 20, title: 'PR for #5', body: 'Ref #5' }, repository: { full_name: 'acme/repo' } });
    handleCheckRunEvent({ action: 'completed', check_run: { name: 'test', conclusion: 'failure', pull_requests: [{ number: 20, title: 'PR for #5', body: 'Ref #5' }] }, repository: { full_name: 'acme/repo' } });
    expect(getTask(5)?.state).toBe('CHECKS_RED');
  });

  it('workflow_run success toggles a required check', () => {
    handleWorkflowRunEvent({ action: 'completed', workflow_run: { name: 'codeql', conclusion: 'success', display_title: 'for #6' }, repository: { full_name: 'acme/repo' } });
    const t = getTask(6)!;
    expect(t.checks.completed['codeql']).toBe(true);
  });
});
