import React from 'react';
import { getTaskStatus } from '../api/orchestrator';
import type { TaskStatusResponse } from '../types';

export function TaskStatus({ issueNumber, pollMs = 5000 }: { issueNumber: number; pollMs?: number }) {
  const [status, setStatus] = React.useState<TaskStatusResponse | null>({
    issue_number: issueNumber,
    repo: '',
    state: 'CREATED',
    checks: { required: [], completed: {}, green: false },
    timeline: [],
    updatedAt: Date.now(),
  });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const s = await getTaskStatus(issueNumber);
        if (alive) setStatus(s);
      } catch (e: any) {
        if (alive) setError(e?.message || 'error');
      }
    }
    tick();
    const id = setInterval(tick, pollMs);
    return () => { alive = false; clearInterval(id); };
  }, [issueNumber, pollMs]);

  if (error) return <div role="alert">{error}</div>;

  const s: TaskStatusResponse = status ?? {
    issue_number: issueNumber,
    repo: '',
    state: 'CREATED',
    checks: { required: [], completed: {}, green: false },
    timeline: [],
    updatedAt: Date.now(),
  };
  return (
    <div>
      <h1>Task {s.issue_number}</h1>
      <div data-testid="state">{s.state}</div>
      {s.pr_number && <a href={`https://github.com/${s.repo}/pull/${s.pr_number}`}>PR</a>}
      <a href={`https://github.com/${s.repo}/issues/${s.issue_number}`}>Issue</a>
      <h3>Checks</h3>
      <ul>
        {s.checks.required.map((name) => (
          <li key={name}>{name}: {s.checks.completed[name] ? 'OK' : 'PENDING'}</li>
        ))}
      </ul>
    </div>
  );
}

export default TaskStatus;
