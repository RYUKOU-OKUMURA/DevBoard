// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPracticeIssueDrafts } from '../../storage/practiceStorage';
import { usePracticeIssues } from '../usePracticeIssues';

const mockCreateIssue = vi.hoisted(() => vi.fn());

vi.mock('../../api/issues', () => ({
  createIssue: (...args: unknown[]) => mockCreateIssue(...args),
}));

describe('usePracticeIssues', () => {
  beforeEach(() => {
    localStorage.clear();
    mockCreateIssue.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists local-only issue drafts for the active account and repository', () => {
    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: 'トップページのボタンを見やすくする',
        reason: '初めて見る人に分かりやすくしたいから',
        doneCriteria: ['ボタンの色が目立つ', '説明文が短い'],
      });
    });

    const drafts = result.current.getDraftsForRepo('repo-1');
    expect(result.current.saveError).toBeNull();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.syncStatus).toBe('local_only');
    expect(drafts[0]?.generatedMarkdown).toContain('## 完了条件');
    expect(getPracticeIssueDrafts('alice-id')).toHaveLength(1);
  });

  it('does not commit optimistic state when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: '保存できないカード',
        reason: '保存エラーを見る',
        doneCriteria: ['エラーが表示される'],
      });
    });

    expect(result.current.saveError).toContain('保存できませんでした');
    expect(result.current.getDraftsForRepo('repo-1')).toEqual([]);
  });

  it('creates a GitHub Issue from a saved draft and stores the resulting URL', async () => {
    mockCreateIssue.mockResolvedValue({
      number: 42,
      html_url: 'https://github.com/alice/frontend-app/issues/42',
    });

    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: 'READMEを書く',
        reason: '使い方を伝える',
        doneCriteria: ['起動手順がある'],
      });
    });

    const draftId = result.current.getDraftsForRepo('repo-1')[0]?.id;

    await act(async () => {
      await result.current.createGitHubIssueFromDraft('alice/frontend-app', draftId ?? '');
    });

    const [updatedDraft] = result.current.getDraftsForRepo('repo-1');
    expect(mockCreateIssue).toHaveBeenCalledWith('alice', 'frontend-app', {
      title: 'READMEを書く',
      body: expect.stringContaining('## やりたいこと'),
    });
    expect(updatedDraft).toMatchObject({
      syncStatus: 'synced',
      githubIssueNumber: 42,
      githubIssueUrl: 'https://github.com/alice/frontend-app/issues/42',
    });
    expect(getPracticeIssueDrafts('alice-id')[0]?.githubIssueUrl).toBe('https://github.com/alice/frontend-app/issues/42');
    expect(result.current.publishError).toBeNull();
  });

  it('marks the draft as failed and exposes a Japanese error when GitHub creation fails', async () => {
    mockCreateIssue.mockRejectedValue(new Error('API request failed with status 403'));

    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: '権限エラーを見る',
        reason: '失敗時の表示を確認する',
        doneCriteria: ['日本語エラーが出る'],
      });
    });

    const draftId = result.current.getDraftsForRepo('repo-1')[0]?.id;

    await act(async () => {
      await result.current.createGitHubIssueFromDraft('alice/frontend-app', draftId ?? '');
    });

    expect(result.current.getDraftsForRepo('repo-1')[0]?.syncStatus).toBe('failed');
    expect(result.current.publishError).toContain('書き込み権限');
  });

  it('does not create a duplicate GitHub Issue for an already synced draft', async () => {
    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: '重複を防ぐ',
        reason: '同じ下書きを再送しない',
        doneCriteria: ['APIが呼ばれない'],
      });
    });

    const [draft] = result.current.getDraftsForRepo('repo-1');
    if (!draft) {
      throw new Error('draft was not created');
    }

    localStorage.clear();
    const syncedDraft = {
      ...draft,
      syncStatus: 'synced' as const,
      githubIssueNumber: 10,
      githubIssueUrl: 'https://github.com/alice/frontend-app/issues/10',
    };
    localStorage.setItem(
      'practice-issues:alice-id',
      JSON.stringify({ version: 1, records: [syncedDraft] })
    );

    await act(async () => {
      await result.current.createGitHubIssueFromDraft('alice/frontend-app', syncedDraft.id);
    });

    expect(mockCreateIssue).not.toHaveBeenCalled();
  });

  it('does not recreate a synced draft even when its URL is missing', async () => {
    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: 'URL欠落データ',
        reason: '古い保存データでも再作成しない',
        doneCriteria: ['APIが呼ばれない'],
      });
    });

    const [draft] = result.current.getDraftsForRepo('repo-1');
    if (!draft) {
      throw new Error('draft was not created');
    }

    const syncedDraft = {
      ...draft,
      syncStatus: 'synced' as const,
      githubIssueNumber: 10,
      githubIssueUrl: undefined,
    };
    localStorage.setItem(
      'practice-issues:alice-id',
      JSON.stringify({ version: 1, records: [syncedDraft] })
    );

    await act(async () => {
      await result.current.createGitHubIssueFromDraft('alice/frontend-app', syncedDraft.id);
    });

    expect(mockCreateIssue).not.toHaveBeenCalled();
  });

  it('guards concurrent GitHub Issue creation for the same draft', async () => {
    mockCreateIssue.mockResolvedValue({
      number: 42,
      html_url: 'https://github.com/alice/frontend-app/issues/42',
    });

    const { result } = renderHook(() => usePracticeIssues('alice-id'));

    act(() => {
      result.current.createIssueDraft('repo-1', {
        title: '同時実行を防ぐ',
        reason: '連打で重複作成しない',
        doneCriteria: ['APIが1回だけ呼ばれる'],
      });
    });

    const draftId = result.current.getDraftsForRepo('repo-1')[0]?.id;

    await act(async () => {
      await Promise.all([
        result.current.createGitHubIssueFromDraft('alice/frontend-app', draftId ?? ''),
        result.current.createGitHubIssueFromDraft('alice/frontend-app', draftId ?? ''),
      ]);
    });

    expect(mockCreateIssue).toHaveBeenCalledTimes(1);
  });
});
