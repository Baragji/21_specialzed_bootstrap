import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { TaskStatus } from '../pages/TaskStatus';

jest.mock('../api/orchestrator', () => ({
  getTaskStatus: jest
    .fn()
    .mockResolvedValueOnce({ issue_number: 5, repo: 'x/y', state: 'CREATED', checks: { required: ['test','codeql'], completed: { test: false, codeql: false }, green: false }, timeline: [], updatedAt: Date.now() })
    .mockResolvedValueOnce({ issue_number: 5, repo: 'x/y', state: 'PR_OPEN', checks: { required: ['test','codeql'], completed: { test: true, codeql: false }, green: false }, timeline: [], updatedAt: Date.now() })
    .mockResolvedValueOnce({ issue_number: 5, repo: 'x/y', state: 'CHECKS_GREEN', checks: { required: ['test','codeql'], completed: { test: true, codeql: true }, green: true }, timeline: [], updatedAt: Date.now() })
}));

const mocked = require('../api/orchestrator');

describe('TaskStatus', () => {
  it('polls and renders state transitions', async () => {
    jest.useFakeTimers();
    render(<TaskStatus issueNumber={5} pollMs={10} />);
    // First tick
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('CREATED'));
  // advance to second tick
  await act(async () => { jest.advanceTimersToNextTimer(); });
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('PR_OPEN'));
  // advance to third tick
  await act(async () => { jest.advanceTimersToNextTimer(); });
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('CHECKS_GREEN'));
    jest.useRealTimers();
  });

  it('surfaces network error', async () => {
    mocked.getTaskStatus.mockRejectedValueOnce(new Error('boom'));
    render(<TaskStatus issueNumber={99} pollMs={10} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
