// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getIssueLocalMeta } from '../../storage/issueLocalMetaStorage';
import { useIssueLocalMeta } from '../useIssueLocalMeta';

describe('useIssueLocalMeta', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads migrated data and persists edits across remounts', () => {
    localStorage.setItem('github-dashboard-todos:alice-id', JSON.stringify([
      { repoId: 'repo-a', issueNumber: 3, priority: 'high', description: 'from todo', updatedAt: '2026-02-01T00:00:00.000Z' },
    ]));
    const { result, unmount } = renderHook(() => useIssueLocalMeta('alice-id'));

    expect(result.current.getMeta('repo-a', 3)?.note).toBe('from todo');
    act(() => result.current.updateMeta('repo-a', 3, { note: 'edited locally' }));
    expect(getIssueLocalMeta('alice-id', 'repo-a', 3)?.note).toBe('edited locally');
    unmount();

    const remounted = renderHook(() => useIssueLocalMeta('alice-id'));
    expect(remounted.result.current.getMeta('repo-a', 3)?.note).toBe('edited locally');
  });

  it('reloads metadata when the account changes', () => {
    localStorage.setItem('devboard-issue-meta:alice-id', JSON.stringify({
      'repo-a#3': { priority: 'high', updatedAt: '2026-02-01T00:00:00.000Z' },
    }));
    localStorage.setItem('devboard-issue-meta:bob-id', JSON.stringify({
      'repo-a#3': { priority: 'low', updatedAt: '2026-02-01T00:00:00.000Z' },
    }));
    const { result, rerender } = renderHook(({ accountId }) => useIssueLocalMeta(accountId), {
      initialProps: { accountId: 'alice-id' },
    });
    expect(result.current.getMeta('repo-a', 3)?.priority).toBe('high');

    rerender({ accountId: 'bob-id' });
    expect(result.current.getMeta('repo-a', 3)?.priority).toBe('low');
  });

  it('reports localStorage write failures', () => {
    const { result } = renderHook(() => useIssueLocalMeta('alice-id'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded'); });

    act(() => result.current.updateMeta('repo-a', 3, { note: 'not saved' }));

    expect(result.current.saveError).toContain('保存できませんでした');
    expect(result.current.getMeta('repo-a', 3)).toBeNull();
  });
});
