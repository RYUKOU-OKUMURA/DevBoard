// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdvancedHome } from '../AdvancedHome';

const sharedProps = {
  activityCount: 0,
  manualRepoCount: 0,
  onOpenActivity: vi.fn(),
  onOpenManualRepos: vi.fn(),
  onOpenLegacyBoard: vi.fn(),
  onOpenIssues: vi.fn(),
  legacyContent: <div>legacy</div>,
  activityContent: <div>activity</div>,
  manualContent: <div>manual</div>,
  todoAiContent: null,
};

describe('AdvancedHome', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('calls onOpenIssues from the overview TODO card', () => {
    render(<AdvancedHome activeSubTab="overview" onSubTabChange={() => undefined} {...sharedProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Issue（やること）画面へ' }));

    expect(sharedProps.onOpenIssues).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenIssues from the TODO・AI sub-tab placeholder', () => {
    render(<AdvancedHome activeSubTab="todoai" onSubTabChange={() => undefined} {...sharedProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Issue（やること）画面へ' }));

    expect(sharedProps.onOpenIssues).toHaveBeenCalledTimes(1);
  });
});
