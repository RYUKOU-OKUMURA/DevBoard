// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TabNavigation } from '../TabNavigation';

describe('TabNavigation', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the primary navigation focused on repositories, issues, practice, and advanced features', () => {
    render(<TabNavigation activeTab="board" onTabChange={() => undefined} advancedCount={3} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'リポジトリ',
      'Issue（やること）',
      '練習',
      '高度な機能3',
    ]);
    expect(screen.getByRole('tab', { name: /高度な機能/ })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: /記録/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /手動追加/ })).toBeNull();
  });

  it('treats hidden legacy destinations as part of the advanced tab', () => {
    render(<TabNavigation activeTab="activity" onTabChange={() => undefined} />);

    expect(screen.getByRole('tab', { name: /高度な機能/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('opens the advanced hub instead of exposing legacy destinations directly', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="activity" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /高度な機能/ }));

    expect(onTabChange).toHaveBeenCalledWith('advanced');
  });

  it('notifies when the issues tab is selected', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="board" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Issue（やること）' }));

    expect(onTabChange).toHaveBeenCalledWith('issues');
  });

  it('supports arrow-key navigation inside the tablist', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="board" onTabChange={onTabChange} />);

    fireEvent.keyDown(screen.getByRole('tab', { name: /リポジトリ/ }), { key: 'ArrowRight' });

    expect(onTabChange).toHaveBeenCalledWith('issues');
  });
});
