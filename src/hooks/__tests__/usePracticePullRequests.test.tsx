// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PracticeIssueDraft } from '../../types';
import { getPracticePullRequestDrafts } from '../../storage/practiceStorage';
import { usePracticePullRequests } from '../usePracticePullRequests';

function createIssueDraft(): PracticeIssueDraft {
  return {
    id: 'issue-draft-1',
    repoId: 'repo-1',
    title: 'READMEを書く',
    reason: '使い方を伝える',
    doneCriteria: ['起動手順がある'],
    generatedMarkdown: '## やりたいこと\nREADMEを書く',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('usePracticePullRequests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists local-only pull request drafts for the active account and repository', () => {
    const issueDraft = createIssueDraft();
    const { result } = renderHook(() => usePracticePullRequests('alice-id'));

    act(() => {
      result.current.createPullRequestDraft(
        'repo-1',
        {
          title: 'READMEに起動手順を追加する',
          changedItems: ['READMEに起動手順を追加した', '環境変数を追記した'],
          reviewPoints: ['手順が初めての人にも分かるか'],
          relatedIssueDraftId: issueDraft.id,
        },
        [issueDraft]
      );
    });

    const drafts = result.current.getDraftsForRepo('repo-1');
    expect(result.current.saveError).toBeNull();
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.syncStatus).toBe('local_only');
    expect(drafts[0]?.relatedIssueDraftId).toBe(issueDraft.id);
    expect(drafts[0]?.generatedMarkdown).toContain('## 変更したこと');
    expect(drafts[0]?.generatedMarkdown).toContain('READMEを書く');
    expect(getPracticePullRequestDrafts('alice-id')).toHaveLength(1);
  });

  it('does not commit optimistic state when storage writes fail', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => usePracticePullRequests('alice-id'));

    act(() => {
      result.current.createPullRequestDraft('repo-1', {
        title: '保存できないPR',
        changedItems: ['READMEを更新した'],
        reviewPoints: ['エラーが表示されるか'],
      });
    });

    expect(result.current.saveError).toContain('保存できませんでした');
    expect(result.current.getDraftsForRepo('repo-1')).toEqual([]);
  });
});
