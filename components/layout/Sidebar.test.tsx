import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

describe('Sidebar release version', () => {
  afterEach(cleanup);

  it('shows the shared 7.13.0 app version', () => {
    render(
      <Sidebar
        currentView="DASHBOARD"
        onChangeView={vi.fn()}
        theme="warm"
        onToggleTheme={vi.fn()}
      />,
    );

    expect(screen.getByText('V7.13.0')).toBeInTheDocument();
  });
});
