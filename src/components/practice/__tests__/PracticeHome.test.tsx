// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PracticeIssueDraft, PracticePullRequestDraft, Repo } from '../../../types';
import { savePracticeIssueDrafts, savePracticePullRequestDrafts } from '../../../storage/practiceStorage';
import { PracticeHome } from '../PracticeHome';

const ACCOUNT_ID = 'alice-id';

function createRepo(): Repo {
  return {
    id: 'repo-1',
    nameWithOwner: 'alice/frontend-app',
    htmlUrl: 'https://github.com/alice/frontend-app',
    pushedAt: '2026-01-01T00:00:00.000Z',
    isArchived: false,
    isPrivate: false,
    description: 'React dashboard',
    primaryLanguage: 'TypeScript',
    topics: ['react'],
  };
}

function createDraft(overrides: Partial<PracticeIssueDraft> = {}): PracticeIssueDraft {
  return {
    id: 'draft-1',
    repoId: 'repo-1',
    title: 'トップページのボタンを見やすくする',
    reason: '初めて見る人に分かりやすくしたいから',
    doneCriteria: ['ボタンの色が目立つ', '説明文が短い'],
    generatedMarkdown: '## やりたいこと\nトップページのボタンを見やすくする',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function createPullRequestDraft(overrides: Partial<PracticePullRequestDraft> = {}): PracticePullRequestDraft {
  return {
    id: 'pr-draft-1',
    repoId: 'repo-1',
    title: 'READMEに起動手順を追加する',
    changedItems: ['READMEを更新した'],
    reviewPoints: ['手順が初めての人にも分かるか'],
    relatedIssueDraftId: 'draft-1',
    generatedMarkdown: '## 変更の確認リクエスト\nREADMEに起動手順を追加する',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  };
}

describe('PracticeHome', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows saved practice drafts with their repository names', () => {
    savePracticeIssueDrafts(ACCOUNT_ID, [createDraft()]);

    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    expect(screen.getByRole('heading', { name: '保存した練習下書き' })).toBeTruthy();
    expect(screen.getByText('トップページのボタンを見やすくする')).toBeTruthy();
    expect(screen.getByText('alice/frontend-app')).toBeTruthy();
    expect(screen.getByText('ボタンの色が目立つ')).toBeTruthy();
    expect(screen.getByText('説明文が短い')).toBeTruthy();
    expect(screen.getByText('Issue')).toBeTruthy();
    expect(screen.getByText('Pull Request')).toBeTruthy();
    expect(screen.getByText('Branch')).toBeTruthy();
    expect(screen.getByText('Merge')).toBeTruthy();
  });

  it('shows GitHub Issue creation status and URL for synced drafts', () => {
    savePracticeIssueDrafts(ACCOUNT_ID, [
      createDraft({
        syncStatus: 'synced',
        githubIssueNumber: 42,
        githubIssueUrl: 'https://github.com/alice/frontend-app/issues/42',
      }),
    ]);

    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    expect(screen.getByText('GitHub作成済み #42')).toBeTruthy();
    expect(screen.getByRole('link', { name: '作成済みIssueを開く' }).getAttribute('href')).toBe(
      'https://github.com/alice/frontend-app/issues/42'
    );
  });

  it('shows saved pull request drafts with related issue context', () => {
    savePracticeIssueDrafts(ACCOUNT_ID, [createDraft()]);
    savePracticePullRequestDrafts(ACCOUNT_ID, [createPullRequestDraft()]);

    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    expect(screen.getByRole('heading', { name: 'Pull Request / 変更の確認リクエスト' })).toBeTruthy();
    expect(screen.getByText('READMEに起動手順を追加する')).toBeTruthy();
    expect(screen.getByText('手順が初めての人にも分かるか')).toBeTruthy();
    expect(screen.getAllByText('トップページのボタンを見やすくする').length).toBeGreaterThan(0);
    expect(screen.getByText('2件')).toBeTruthy();
  });

  it('keeps orphaned pull request drafts visible without a repository detail action', () => {
    savePracticePullRequestDrafts(ACCOUNT_ID, [createPullRequestDraft({ repoId: 'missing-repo' })]);

    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    expect(screen.getByText('未取得のリポジトリ (missing-repo)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'リポジトリ詳細へ戻る' })).toBeNull();
  });

  it('opens the target repository detail from a saved draft', () => {
    savePracticeIssueDrafts(ACCOUNT_ID, [createDraft()]);

    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    fireEvent.click(screen.getByRole('button', { name: 'リポジトリ詳細へ戻る' }));

    expect(screen.getByRole('dialog', { name: /frontend-app/ })).toBeTruthy();
    expect(screen.getByText('React dashboard')).toBeTruthy();
    expect(screen.getAllByText('トップページのボタンを見やすくする').length).toBeGreaterThan(0);
  });

  it('keeps orphaned drafts visible without a repository detail action', () => {
    savePracticeIssueDrafts(ACCOUNT_ID, [createDraft({ repoId: 'missing-repo' })]);

    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    expect(screen.getByText('未取得のリポジトリ (missing-repo)')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'リポジトリ詳細へ戻る' })).toBeNull();
  });

  it('shows an empty state before drafts are created', () => {
    render(<PracticeHome accountId={ACCOUNT_ID} repos={[createRepo()]} />);

    expect(screen.getByText('まだ練習下書きがありません')).toBeTruthy();
  });
});
