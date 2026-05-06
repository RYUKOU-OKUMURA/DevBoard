// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TabNavigation } from '../TabNavigation';

describe('TabNavigation', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps the primary navigation focused on repositories, practice, and advanced features', () => {
    render(<TabNavigation activeTab="board" onTabChange={() => undefined} advancedCount={3} />);

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /リポジトリ/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /練習/ })).toBeTruthy();
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

  it('supports arrow-key navigation inside the tablist', () => {
    const onTabChange = vi.fn();

    render(<TabNavigation activeTab="board" onTabChange={onTabChange} />);

    fireEvent.keyDown(screen.getByRole('tab', { name: /リポジトリ/ }), { key: 'ArrowRight' });

    expect(onTabChange).toHaveBeenCalledWith('practice');
  });
});
