import React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from '../app';

describe('App router', () => {
  it('renders New Task by default', () => {
    // Ensure no hash
    globalThis.location.hash = '';
    render(<App />);
    expect(screen.getByText(/New Task/i)).toBeInTheDocument();
  });

  it('renders TaskStatus when hash is set', () => {
    globalThis.location.hash = '#/status/99';
    render(<App />);
    expect(screen.getByText(/Task 99/)).toBeInTheDocument();
  });
});
