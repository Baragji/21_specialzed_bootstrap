import { FastifyInstance } from 'fastify';
import { handleIssuesEvent } from './handlers/issues';
import { handlePullRequestEvent } from './handlers/pull_request';
import { handleCheckRunEvent } from './handlers/check_run';
import { handleWorkflowRunEvent } from './handlers/workflow_run';

export function routeGithubEvent(event: string, payload: any) {
  switch (event) {
    case 'issues':
      return handleIssuesEvent(payload);
    case 'issue_comment':
      // Move to IN_PROGRESS on any agent-like comment
      try {
        const issue = payload.issue;
        const body: string | undefined = payload.comment?.body;
        if (issue && body && /plan|steps|agent/i.test(body)) {
          // handler inline to avoid cycle; import lazily
          const { setState, upsertTask, addEvent } = require('../state/store');
          upsertTask({ issue_number: issue.number, repo: payload.repository?.full_name });
          setState(issue.number, 'IN_PROGRESS');
          addEvent(issue.number, { ts: Date.now(), event: 'issue_comment', action: 'created' });
        }
      } catch {
        // noop
      }
      return;
    case 'pull_request':
      return handlePullRequestEvent(payload);
    case 'check_run':
      return handleCheckRunEvent(payload);
    case 'workflow_run':
      return handleWorkflowRunEvent(payload);
    default:
      return; // ignore others
  }
}
