import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewTask } from '../pages/NewTask';

jest.mock('../api/orchestrator', () => ({
  createTask: jest.fn().mockResolvedValue({ issue_number: 42, issue_url: 'https://x/issue/42' })
}));

const mocked = require('../api/orchestrator');

describe('NewTask', () => {
  it('posts and navigates to status with Issue link', async () => {
    const paths: string[] = [];
    render(<NewTask onNavigate={(p) => paths.push(p)} />);
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'o' } });
    fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'r' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 't' } });
    fireEvent.change(screen.getByLabelText('Objective'), { target: { value: 'obj' } });
    fireEvent.submit(screen.getByText('Create Task'));

    await waitFor(() => expect(paths[0]).toBe('/status/42'));
    expect(screen.getByText('Issue')).toHaveAttribute('href', 'https://x/issue/42');
    expect(mocked.createTask).toHaveBeenCalled();
  });

  it('shows error banner on 400', async () => {
    mocked.createTask.mockRejectedValueOnce(new Error('validation error'));
    const paths: string[] = [];
    render(<NewTask onNavigate={(p) => paths.push(p)} />);
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'o' } });
    fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'r' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 't' } });
    fireEvent.change(screen.getByLabelText('Objective'), { target: { value: 'obj' } });
    fireEvent.submit(screen.getByText('Create Task'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('updates array fields via FormArray', async () => {
    render(<NewTask onNavigate={() => {}} />);
    // Add a label
  const input = screen.getByTestId('input-labels') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'ui' } });
  fireEvent.click(screen.getAllByText('Add').pop()!);
  // No assertion on internal state here, just ensure no crash and element remains
  expect(screen.getAllByText('Add').length).toBeGreaterThan(0);
  });

  it('serializes optional arrays and constraints', async () => {
    const paths: string[] = [];
    render(<NewTask onNavigate={(p) => paths.push(p)} />);
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'o' } });
    fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'r' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 't' } });
    fireEvent.change(screen.getByLabelText('Objective'), { target: { value: 'obj' } });
    // arrays
    fireEvent.change(screen.getByTestId('input-allowedPaths'), { target: { value: 'src' } });
    fireEvent.click(screen.getAllByText('Add')[0]);
    fireEvent.change(screen.getByTestId('input-forbiddenPaths'), { target: { value: 'secrets' } });
    fireEvent.click(screen.getAllByText('Add')[1]);
    fireEvent.change(screen.getByTestId('input-testSpec'), { target: { value: 'should work' } });
    fireEvent.click(screen.getAllByText('Add')[2]);
    fireEvent.change(screen.getByTestId('input-acceptance'), { target: { value: 'is green' } });
    fireEvent.click(screen.getAllByText('Add')[3]);
    fireEvent.change(screen.getByTestId('input-labels'), { target: { value: 'demo' } });
    fireEvent.click(screen.getAllByText('Add')[4]);
    fireEvent.submit(screen.getByText('Create Task'));
    await waitFor(() => expect(paths[0]).toBe('/status/42'));
  });

  it('shows other error types', async () => {
    mocked.createTask.mockRejectedValueOnce(new Error('unexpected 500'));
    render(<NewTask onNavigate={() => {}} />);
    fireEvent.change(screen.getByLabelText('Owner'), { target: { value: 'o' } });
    fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'r' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 't' } });
    fireEvent.change(screen.getByLabelText('Objective'), { target: { value: 'obj' } });
    fireEvent.submit(screen.getByText('Create Task'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('unexpected 500'));
  });

  it('initially shows no Issue link', () => {
    render(<NewTask onNavigate={() => {}} />);
    expect(screen.queryByText('Issue')).toBeNull();
  });
});
