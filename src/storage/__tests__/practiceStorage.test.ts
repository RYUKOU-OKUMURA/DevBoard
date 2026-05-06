// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import type { PracticeIssueDraft, PracticePullRequestDraft } from '../../types';
import {
  clearPracticePullRequestDrafts,
  clearPracticeIssueDrafts,
  createPracticeIssueDraft,
  createPracticePullRequestDraft,
  getPracticeIssueDrafts,
  getPracticeIssueDraftsKey,
  getPracticePullRequestDrafts,
  getPracticePullRequestDraftsKey,
  savePracticeIssueDrafts,
  savePracticePullRequestDrafts,
} from '../practiceStorage';

const ACCOUNT_A = 'alice-id';
const ACCOUNT_B = 'bob-id';

function createDraft(id = 'draft-1', repoId = 'repo-1'): PracticeIssueDraft {
  return {
    id,
    repoId,
    title: 'トップページのボタンを見やすくする',
    reason: '初めて見る人に分かりやすくしたいから',
    doneCriteria: ['ボタンの色が目立つ'],
    generatedMarkdown: '## やりたいこと\nトップページのボタンを見やすくする',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createPullRequestDraft(id = 'pr-draft-1', repoId = 'repo-1'): PracticePullRequestDraft {
  return {
    id,
    repoId,
    title: 'READMEに起動手順を追加する',
    changedItems: ['READMEに起動手順を追加した'],
    reviewPoints: ['手順が初めての人にも分かるか'],
    relatedIssueDraftId: 'draft-1',
    generatedMarkdown: '## 変更の確認リクエスト\nREADMEに起動手順を追加する',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('practiceStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('namespaces practice issue drafts by accountId', () => {
    savePracticeIssueDrafts(ACCOUNT_A, [createDraft('draft-a', 'repo-a')]);
    savePracticeIssueDrafts(ACCOUNT_B, [createDraft('draft-b', 'repo-b')]);

    expect(getPracticeIssueDrafts(ACCOUNT_A).map((draft) => draft.repoId)).toEqual(['repo-a']);
    expect(getPracticeIssueDrafts(ACCOUNT_B).map((draft) => draft.repoId)).toEqual(['repo-b']);
  });

  it('namespaces practice pull request drafts by accountId', () => {
    savePracticePullRequestDrafts(ACCOUNT_A, [createPullRequestDraft('pr-a', 'repo-a')]);
    savePracticePullRequestDrafts(ACCOUNT_B, [createPullRequestDraft('pr-b', 'repo-b')]);

    expect(getPracticePullRequestDrafts(ACCOUNT_A).map((draft) => draft.repoId)).toEqual(['repo-a']);
    expect(getPracticePullRequestDrafts(ACCOUNT_B).map((draft) => draft.repoId)).toEqual(['repo-b']);
  });

  it('stores a versioned envelope and strips fields that would imply GitHub creation', () => {
    savePracticeIssueDrafts(ACCOUNT_A, [
      {
        ...createDraft(),
        githubIssueNumber: 12,
        githubIssueUrl: 'https://github.com/alice/repo/issues/12',
      } as PracticeIssueDraft & Record<string, unknown>,
    ]);

    const raw = localStorage.getItem(getPracticeIssueDraftsKey(ACCOUNT_A));
    const parsed = raw ? JSON.parse(raw) : null;

    expect(parsed?.version).toBe(1);
    expect(parsed?.records).toHaveLength(1);
    expect(parsed?.records[0]).toEqual(createDraft());
    expect(parsed?.records[0].githubIssueNumber).toBeUndefined();
    expect(parsed?.records[0].githubIssueUrl).toBeUndefined();
  });

  it('stores pull request drafts in a versioned envelope and strips GitHub creation fields', () => {
    savePracticePullRequestDrafts(ACCOUNT_A, [
      {
        ...createPullRequestDraft(),
        githubPullRequestNumber: 3,
        githubPullRequestUrl: 'https://github.com/alice/repo/pull/3',
        branchName: 'feature/readme',
      } as PracticePullRequestDraft & Record<string, unknown>,
    ]);

    const raw = localStorage.getItem(getPracticePullRequestDraftsKey(ACCOUNT_A));
    const parsed = raw ? JSON.parse(raw) : null;

    expect(parsed?.version).toBe(1);
    expect(parsed?.records).toHaveLength(1);
    expect(parsed?.records[0]).toEqual(createPullRequestDraft());
    expect(parsed?.records[0].githubPullRequestNumber).toBeUndefined();
    expect(parsed?.records[0].githubPullRequestUrl).toBeUndefined();
    expect(parsed?.records[0].branchName).toBeUndefined();
  });

  it('drops corrupted JSON and invalid envelopes without crashing', () => {
    localStorage.setItem(getPracticeIssueDraftsKey(ACCOUNT_A), '{invalid-json');
    expect(getPracticeIssueDrafts(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getPracticeIssueDraftsKey(ACCOUNT_A))).toBeNull();

    localStorage.setItem(getPracticeIssueDraftsKey(ACCOUNT_A), JSON.stringify({ version: 1, records: 'wrong' }));
    expect(getPracticeIssueDrafts(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getPracticeIssueDraftsKey(ACCOUNT_A))).toBeNull();
  });

  it('drops corrupted pull request JSON and invalid envelopes without crashing', () => {
    localStorage.setItem(getPracticePullRequestDraftsKey(ACCOUNT_A), '{invalid-json');
    expect(getPracticePullRequestDrafts(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getPracticePullRequestDraftsKey(ACCOUNT_A))).toBeNull();

    localStorage.setItem(getPracticePullRequestDraftsKey(ACCOUNT_A), JSON.stringify({ version: 1, records: 'wrong' }));
    expect(getPracticePullRequestDrafts(ACCOUNT_A)).toEqual([]);
    expect(localStorage.getItem(getPracticePullRequestDraftsKey(ACCOUNT_A))).toBeNull();
  });

  it('creates local-only drafts by default', () => {
    expect(
      createPracticeIssueDraft({
        id: 'draft-1',
        repoId: 'repo-1',
        title: 'READMEを書く',
        reason: '使い方を伝える',
        doneCriteria: ['起動手順がある'],
        generatedMarkdown: '## やりたいこと\nREADMEを書く',
        now: '2026-02-01T00:00:00.000Z',
      })
    ).toMatchObject({
      syncStatus: 'local_only',
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });

  it('creates local-only pull request drafts by default', () => {
    expect(
      createPracticePullRequestDraft({
        id: 'pr-draft-1',
        repoId: 'repo-1',
        title: 'READMEに起動手順を追加する',
        changedItems: ['READMEに起動手順を追加した'],
        reviewPoints: ['手順が初めての人にも分かるか'],
        relatedIssueDraftId: null,
        generatedMarkdown: '## 変更の確認リクエスト\nREADMEに起動手順を追加する',
        now: '2026-02-01T00:00:00.000Z',
      })
    ).toMatchObject({
      syncStatus: 'local_only',
      relatedIssueDraftId: null,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    });
  });

  it('throws when accountId is missing', () => {
    expect(() => getPracticeIssueDrafts('')).toThrow('accountId is required');
    expect(() => getPracticePullRequestDrafts('')).toThrow('accountId is required');
    expect(() => savePracticeIssueDrafts('', [])).toThrow('accountId is required');
    expect(() => savePracticePullRequestDrafts('', [])).toThrow('accountId is required');
    expect(() => clearPracticeIssueDrafts('')).toThrow('accountId is required');
    expect(() => clearPracticePullRequestDrafts('')).toThrow('accountId is required');
  });
});
