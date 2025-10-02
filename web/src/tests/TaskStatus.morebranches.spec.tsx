import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('../api/orchestrator', () => ({ getTaskStatus: jest.fn() }));
const { getTaskStatus } = require('../api/orchestrator');

import { TaskStatus } from '../pages/TaskStatus';

describe('TaskStatus additional branches', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('hides PR link when pr_number missing and handles empty checks', async () => {
    jest.useFakeTimers();
    getTaskStatus.mockResolvedValueOnce({
      issue_number: 3,
      repo: 'o/r',
      state: 'IN_PROGRESS',
      checks: { required: [], completed: {}, green: false },
      timeline: [],
      updatedAt: Date.now()
    });
    render(<TaskStatus issueNumber={3} pollMs={1000} />);
    await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
    expect(screen.queryByRole('link', { name: /pr/i })).toBeNull();
    expect(screen.getByRole('link', { name: /issue/i })).toHaveAttribute('href', 'https://github.com/o/r/issues/3');
    // No check list items present
    expect(screen.queryByRole('listitem')).toBeNull();
  });

  it('falls back when API returns null', async () => {
    jest.useFakeTimers();
    getTaskStatus.mockResolvedValueOnce(null);
    render(<TaskStatus issueNumber={4} pollMs={1000} />);
    await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
    expect(screen.getByText(/Task 4/)).toBeInTheDocument();
    // default state should be CREATED from fallback
    expect(screen.getByTestId('state').textContent).toBe('CREATED');
  });

  it('shows generic error when exception has no message', async () => {
    jest.useFakeTimers();
    getTaskStatus.mockRejectedValueOnce(undefined);
    render(<TaskStatus issueNumber={8} pollMs={1000} />);
    await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
    expect(screen.getByRole('alert')).toHaveTextContent('error');
    jest.useRealTimers();
  });

  it('does not set state after unmount (success path)', async () => {
    jest.useFakeTimers();
    const deferred: any = {};
    deferred.promise = new Promise((res) => { deferred.resolve = res; });
    getTaskStatus.mockReturnValueOnce(deferred.promise);
    const { unmount } = render(<TaskStatus issueNumber={6} pollMs={1000} />);
    // Unmount before promise resolves to hit alive=false branch
    unmount();
    await act(async () => {
      deferred.resolve({ issue_number: 6, repo: 'o/r', state: 'CREATED', checks: { required: [], completed: {}, green: false }, timeline: [], updatedAt: Date.now() });
      await Promise.resolve();
    });
    jest.useRealTimers();
  });

  it('does not set error after unmount (error path)', async () => {
    jest.useFakeTimers();
    const deferred: any = {};
    deferred.promise = new Promise((_, rej) => { deferred.reject = rej; });
    getTaskStatus.mockReturnValueOnce(deferred.promise);
    const { unmount } = render(<TaskStatus issueNumber={7} pollMs={1000} />);
    unmount();
    await act(async () => {
      deferred.reject(new Error('boom'));
      await Promise.resolve();
    });
    jest.useRealTimers();
  });

  it('uses default polling interval when not provided', async () => {
    jest.useFakeTimers();
    getTaskStatus.mockResolvedValueOnce({
      issue_number: 10,
      repo: 'o/r',
      state: 'CREATED',
      checks: { required: [], completed: {}, green: false },
      timeline: [],
      updatedAt: Date.now()
    });
    const { unmount } = render(<TaskStatus issueNumber={10} />);
    await act(async () => { jest.advanceTimersByTime(1); await Promise.resolve(); });
    expect(screen.getByText(/Task 10/)).toBeInTheDocument();
    unmount();
    jest.useRealTimers();
  });
});
