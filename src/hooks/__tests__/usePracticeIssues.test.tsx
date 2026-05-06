// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPracticeIssueDrafts } from '../../storage/practiceStorage';
import { usePracticeIssues } from '../usePracticeIssues';

describe('usePracticeIssues', () => {
  beforeEach(() => {
    localStorage.clear();
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
});
