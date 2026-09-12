import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuideView } from './Guide';

describe('Guide release history', () => {
  afterEach(cleanup);

  it('includes the 7.13.0 weekly bookkeeping release', () => {
    render(<GuideView />);

    expect(screen.getByRole('heading', { name: /^V7\.13\.0 / })).toBeInTheDocument();
  });

  it('marks only the 7.13.0 release as Latest', () => {
    render(<GuideView />);

    const latestBadges = screen.getAllByText('Latest');
    expect(latestBadges).toHaveLength(1);
    const releaseHeader = latestBadges[0].parentElement;
    expect(releaseHeader).not.toBeNull();
    expect(within(releaseHeader!).getByRole('heading', { name: /^V7\.13\.0 / })).toBeInTheDocument();
  });
});
