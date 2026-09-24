// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubIssue } from '../../api/issues';
import type { Repo } from '../../types';
import { createDefaultRepositoryMeta, getRepositoryMetaMap, saveRepositoryMetaMap } from '../../storage/repositoryMetaStorage';
import { clearTrackedRepoIssuesCache, useTrackedRepoIssues } from '../useTrackedRepoIssues';

const mockFetchIssuesPage = vi.hoisted(() => vi.fn());

vi.mock('../../api/issues', () => ({
  fetchIssuesPage: (...args: unknown[]) => mockFetchIssuesPage(...args),
}));

function createRepo(id: string, nameWithOwner = `alice/${id}`): Repo {
  return {
    id,
    nameWithOwner,
    htmlUrl: `https://github.com/${nameWithOwner}`,
    pushedAt: '2026-01-01T00:00:00.000Z',
    isArchived: false,
    isPrivate: false,
    topics: [],
  };
}

function createIssue(number: number, overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    id: number,
    number,
    title: `Issue ${number}`,
    body: null,
    state: 'open',
    html_url: `https://github.com/alice/repo/issues/${number}`,
    user: { login: 'alice', avatar_url: '', html_url: 'https://github.com/alice' },
    assignees: [],
    labels: [],
    comments: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    closed_at: null,
    ...overrides,
  };
}

function setTracked(accountId: string, repoId: string, tracked = true): void {
  const meta = createDefaultRepositoryMeta(repoId, '2026-01-01T00:00:00.000Z');
  saveRepositoryMetaMap(accountId, { ...getRepositoryMetaMap(accountId), [repoId]: { ...meta, tracked } });
}

describe('useTrackedRepoIssues', () => {
  beforeEach(() => {
    localStorage.clear();
    clearTrackedRepoIssuesCache();
    mockFetchIssuesPage.mockReset();
    mockFetchIssuesPage.mockResolvedValue({ issues: [], rawCount: 0 });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('fetches only tracked repositories and excludes pull requests', async () => {
    const tracked = createRepo('tracked');
    const untracked = createRepo('untracked');
    setTracked('alice-id', tracked.id);
    setTracked('alice-id', untracked.id, false);
    mockFetchIssuesPage.mockResolvedValue({
      issues: [createIssue(1), createIssue(2, { pull_request: { url: 'api/pr/2', html_url: 'https://github.com/alice/tracked/pull/2' } })],
      rawCount: 2,
    });

    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', [tracked, untracked]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.trackedCount).toBe(1);
    expect(result.current.items.map(({ issue }) => issue.number)).toEqual([1]);
    expect(mockFetchIssuesPage).toHaveBeenCalledTimes(1);
    expect(mockFetchIssuesPage).toHaveBeenCalledWith('alice', 'tracked', {
      state: 'all', per_page: 100, page: 1, sort: 'updated', direction: 'desc',
    });
  });

  it('fetches through the third page when the raw page count stays at 100', async () => {
    const repo = createRepo('large');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockImplementation(async (_owner: string, _name: string, options: { page: number }) => ({
      issues: Array.from({ length: 100 }, (_, index) => createIssue((options.page - 1) * 100 + index + 1)),
      rawCount: 100,
    }));

    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(300);
    expect(mockFetchIssuesPage.mock.calls.map((call) => call[2].page)).toEqual([1, 2, 3]);
  });

  it('continues when a 100-item raw page contains a pull request', async () => {
    const repo = createRepo('mixed');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({
        issues: [
          ...Array.from({ length: 99 }, (_, index) => createIssue(index + 1)),
          createIssue(100, { pull_request: { url: 'api/pr/100', html_url: 'https://github.com/alice/mixed/pull/100' } }),
        ],
        rawCount: 100,
      })
      .mockResolvedValueOnce({ issues: [createIssue(101)], rawCount: 1 });

    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2);
    expect(result.current.items).toHaveLength(100);
    expect(result.current.items.some(({ issue }) => issue.pull_request)).toBe(false);
  });

  it('keeps successful repository results when another repository fails', async () => {
    const good = createRepo('good');
    const bad = createRepo('bad');
    setTracked('alice-id', good.id);
    setTracked('alice-id', bad.id);
    mockFetchIssuesPage.mockImplementation(async (_owner: string, name: string) => {
      if (name === 'bad') throw new Error('network failure');
      return { issues: [createIssue(1)], rawCount: 1 };
    });

    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', [good, bad]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map(({ repo }) => repo.id)).toEqual(['good']);
    expect(result.current.errorsByRepoId).toEqual({
      bad: 'alice/bad のIssueを読み込めませんでした。時間をおいて再試行してください。',
    });
  });

  it('limits concurrent repository requests to three', async () => {
    const repos = Array.from({ length: 7 }, (_, index) => createRepo(`repo-${index}`));
    repos.forEach((repo) => setTracked('alice-id', repo.id));
    let active = 0;
    let maximum = 0;
    mockFetchIssuesPage.mockImplementation(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { issues: [], rawCount: 0 };
    });

    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', repos));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(maximum).toBe(3);
  });

  it('reuses the five-minute cache on remount and reload forces a new fetch', async () => {
    let now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const repo = createRepo('cached');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(1)], rawCount: 1 });

    const first = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    first.unmount();

    const second = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(mockFetchIssuesPage).toHaveBeenCalledTimes(1);

    act(() => second.result.current.reload());
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    now += 5 * 60 * 1000;
    second.unmount();
    const expired = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(expired.result.current.isLoading).toBe(false));
  });

  it('does not share the same repository cache across accounts', async () => {
    const repo = createRepo('same-repo');
    setTracked('account-a', repo.id);
    setTracked('account-b', repo.id);

    const first = renderHook(() => useTrackedRepoIssues('account-a', [repo]));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    first.unmount();
    const second = renderHook(() => useTrackedRepoIssues('account-b', [repo]));

    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2);
  });

  it('replaces one issue in the account cache so it stays updated after remount', async () => {
    const repo = createRepo('repo');
    const initialIssue = createIssue(1);
    const closedIssue = createIssue(1, { state: 'closed', closed_at: '2026-02-01T00:00:00.000Z' });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [initialIssue], rawCount: 1 });

    const first = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    act(() => first.result.current.replaceIssue(repo.id, closedIssue.id, closedIssue));
    expect(first.result.current.items[0]?.issue).toEqual(closedIssue);
    first.unmount();

    const second = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));
    expect(second.result.current.items[0]?.issue).toEqual(closedIssue);
    expect(mockFetchIssuesPage).toHaveBeenCalledTimes(1);
  });

  it('applies sequential issue updates to the latest cached issue', async () => {
    const repo = createRepo('repo');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({
      issues: [createIssue(1, { comments: 2 })],
      rawCount: 1,
    });
    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const addComment = (current: GitHubIssue) => ({ ...current, comments: current.comments + 1 });
    act(() => {
      result.current.replaceIssue(repo.id, 1, addComment);
      result.current.replaceIssue(repo.id, 1, addComment);
    });

    expect(result.current.items[0]?.issue.comments).toBe(4);
  });

  it('uses a newer GET result over an older local replacement', async () => {
    const repo = createRepo('repo');
    const initialIssue = createIssue(1, { updated_at: '2026-01-01T00:00:00.000Z' });
    const localIssue = createIssue(1, {
      state: 'closed',
      updated_at: '2026-02-01T00:00:00.000Z',
      closed_at: '2026-02-01T00:00:00.000Z',
    });
    const newerGetIssue = createIssue(1, { updated_at: '2026-03-01T00:00:00.000Z' });
    let resolveReload: (result: { issues: GitHubIssue[]; rawCount: number }) => void = () => undefined;
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({ issues: [initialIssue], rawCount: 1 })
      .mockReturnValueOnce(new Promise((resolve) => { resolveReload = resolve; }));

    const { result } = renderHook(() => useTrackedRepoIssues('alice-id', [repo]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.reload());
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2));
    act(() => result.current.replaceIssue(repo.id, 1, localIssue));
    await act(async () => resolveReload({ issues: [newerGetIssue], rawCount: 1 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items[0]?.issue).toEqual(newerGetIssue);
  });

  it('ignores a previous account response after switching accounts', async () => {
    const repo = createRepo('shared-repo');
    setTracked('account-a', repo.id);
    setTracked('account-b', repo.id);
    const pending: Array<(result: { issues: GitHubIssue[]; rawCount: number }) => void> = [];
    mockFetchIssuesPage.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));

    const hook = renderHook(
      ({ accountId }: { accountId: string }) => useTrackedRepoIssues(accountId, [repo]),
      { initialProps: { accountId: 'account-a' } }
    );
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(1));
    hook.rerender({ accountId: 'account-b' });
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2));

    await act(async () => pending[1]?.({ issues: [createIssue(2)], rawCount: 1 }));
    await waitFor(() => expect(hook.result.current.items.map(({ issue }) => issue.number)).toEqual([2]));
    await act(async () => pending[0]?.({ issues: [createIssue(1)], rawCount: 1 }));

    expect(hook.result.current.items.map(({ issue }) => issue.number)).toEqual([2]);
  });
});
