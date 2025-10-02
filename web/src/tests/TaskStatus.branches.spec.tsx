import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { TaskStatus } from '../pages/TaskStatus';

jest.mock('../api/orchestrator', () => ({
  getTaskStatus: jest.fn().mockResolvedValue({
    issue_number: 1,
    repo: 'owner/repo',
    state: 'PR_OPEN',
    pr_number: 2,
    checks: { required: ['test', 'codeql'], completed: { test: true, codeql: false }, green: false },
    timeline: [],
    updatedAt: Date.now()
  })
}));

describe('TaskStatus branches', () => {
  it('renders PR link and checks list', async () => {
    jest.useFakeTimers();
    render(<TaskStatus issueNumber={1} pollMs={1000} />);

    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(screen.getByRole('link', { name: /issue/i })).toHaveAttribute('href', 'https://github.com/owner/repo/issues/1');
    expect(screen.getByRole('link', { name: /pr/i })).toHaveAttribute('href', 'https://github.com/owner/repo/pull/2');

    // Checks rendered with their names
    expect(screen.getByText(/test/i)).toBeInTheDocument();
    expect(screen.getByText(/codeql/i)).toBeInTheDocument();

    jest.useRealTimers();
  });
});
