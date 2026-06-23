// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PracticeIssueDraft, PracticePullRequestDraft, Repo, RepoUserMeta } from '../../../types';
import { RepositoryCard } from '../RepositoryCard';
import { RepositoryDetailPanel } from '../RepositoryDetailPanel';

function createRepo(): Repo {
  return {
    id: 'repo-1',
    nameWithOwner: 'alice/frontend-app',
    htmlUrl: 'https://github.com/alice/frontend-app',
    pushedAt: '2025-01-01T00:00:00.000Z',
    isArchived: false,
    isPrivate: false,
    description: 'React dashboard',
    primaryLanguage: 'TypeScript',
    topics: ['react'],
  };
}

function createMeta(): RepoUserMeta {
  return {
    repoId: 'repo-1',
    tracked: true,
    status: 'in_progress',
    stage: 'implementation',
    scheduleBucket: 'this_week',
    purpose: '公開前の整理',
    nextAction: 'READMEに使い方を足す',
    note: 'Issue練習で分解する',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function createPracticeDraft(overrides: Partial<PracticeIssueDraft> = {}): PracticeIssueDraft {
  return {
    id: 'draft-1',
    repoId: 'repo-1',
    title: 'トップページのボタンを見やすくする',
    reason: '初めて見る人に分かりやすくしたいから',
    doneCriteria: ['ボタンの色が目立つ'],
    generatedMarkdown: '## やりたいこと\nトップページのボタンを見やすくする\n\n## 理由\n初めて見る人に分かりやすくしたいから\n\n## 完了条件\n- ボタンの色が目立つ',
    syncStatus: 'local_only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createPracticePullRequestDraft(): PracticePullRequestDraft {
  return {
    id: 'pr-draft-1',
    repoId: 'repo-1',
    title: 'READMEに起動手順を追加する',
    changedItems: ['READMEを更新した'],
    reviewPoints: ['手順が初めての人にも分かるか'],
    relatedIssueDraftId: 'draft-1',
    generatedMarkdown: '## 変更の確認リクエスト\nREADMEに起動手順を追加する\n\n## 変更したこと\n- READMEを更新した',
    syncStatus: 'local_only',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

function renderDetailPanel(props: Partial<ComponentProps<typeof RepositoryDetailPanel>> = {}) {
  return render(
    <RepositoryDetailPanel
      repo={createRepo()}
      autoHealth="Active"
      userMeta={null}
      saveError={null}
      onUserMetaChange={() => undefined}
      onClose={() => undefined}
      {...props}
    />
  );
}

describe('RepositoryCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('limits GitHub navigation to the explicit link', () => {
    const markup = renderToStaticMarkup(
      <RepositoryCard
        repo={createRepo()}
        autoHealth="Active"
        userMeta={null}
        onOpenDetail={() => undefined}
      />
    );

    expect(markup).toContain('<article');
    expect(markup).toContain('GitHubで開く');
    expect(markup).toContain('href="https://github.com/alice/frontend-app"');
    expect(markup).not.toContain('role="button"');
  });

  it('opens details from the card detail button', () => {
    const repo = createRepo();
    const onOpenDetail = vi.fn();

    render(<RepositoryCard repo={repo} autoHealth="Active" userMeta={null} onOpenDetail={onOpenDetail} />);

    fireEvent.click(screen.getByRole('button', { name: 'alice/frontend-app の詳細を開く' }));

    expect(onOpenDetail).toHaveBeenCalledWith(repo);
  });

  it('does not open details from the explicit GitHub link', () => {
    const onOpenDetail = vi.fn();

    render(<RepositoryCard repo={createRepo()} autoHealth="Active" userMeta={null} onOpenDetail={onOpenDetail} />);

    fireEvent.click(screen.getByRole('link', { name: 'alice/frontend-app をGitHubで開く' }));

    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it('shows saved user status and next action quietly', () => {
    render(
      <RepositoryCard
        repo={createRepo()}
        autoHealth="Active"
        userMeta={createMeta()}
        onOpenDetail={() => undefined}
      />
    );

    expect(screen.getByText('自分の状態: 進行中')).toBeTruthy();
    expect(screen.getByText('次にやること: READMEに使い方を足す')).toBeTruthy();
  });

  it('toggles progress tracking from the all view', () => {
    const onToggleTracked = vi.fn();
    render(
      <RepositoryCard
        repo={createRepo()}
        autoHealth="Active"
        userMeta={null}
        onOpenDetail={() => undefined}
        onToggleTracked={onToggleTracked}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '進捗管理に追加' }));

    expect(onToggleTracked).toHaveBeenCalledWith('repo-1');
  });

  it('shows the untrack button for tracked repositories', () => {
    const onToggleTracked = vi.fn();
    render(
      <RepositoryCard
        repo={createRepo()}
        autoHealth="Active"
        userMeta={createMeta()}
        tracked
        onOpenDetail={() => undefined}
        onToggleTracked={onToggleTracked}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '進捗管理から外す' }));

    expect(onToggleTracked).toHaveBeenCalledWith('repo-1');
  });
});

describe('RepositoryDetailPanel', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows repository details and the explicit GitHub actions', () => {
    renderDetailPanel();

    expect(screen.getByRole('dialog', { name: /frontend-app/ })).toBeTruthy();
    expect(screen.getByText('React dashboard')).toBeTruthy();
    expect(screen.getByText('https://github.com/alice/frontend-app')).toBeTruthy();
    expect(screen.getByText('TypeScript')).toBeTruthy();
    expect(screen.getAllByText('Public / 公開').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'alice/frontend-app をGitHubで開く' })).toHaveLength(1);
    expect(screen.queryByRole('link', { name: 'https://github.com/alice/frontend-app' })).toBeNull();
  });

  it('shows private and archived states', () => {
    renderDetailPanel({
      repo: { ...createRepo(), isArchived: true, isPrivate: true },
      autoHealth: 'Archived',
    });

    expect(screen.getAllByText('Private / 非公開').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Archived / アーカイブ').length).toBeGreaterThan(0);
    expect(screen.getByText('Archived / アーカイブ済み')).toBeTruthy();
  });

  it('closes with the close button and Escape key', () => {
    const onClose = vi.fn();
    renderDetailPanel({ onClose });

    fireEvent.click(screen.getByRole('button', { name: 'リポジトリ詳細を閉じる' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('shows editable user metadata fields', () => {
    renderDetailPanel({ userMeta: createMeta() });

    expect((screen.getByLabelText('自分の状態') as HTMLSelectElement).value).toBe('in_progress');
    expect((screen.getByLabelText('このリポジトリの目的') as HTMLInputElement).value).toBe('公開前の整理');
    expect((screen.getByLabelText('次にやること') as HTMLInputElement).value).toBe('READMEに使い方を足す');
    expect((screen.getByLabelText('メモ') as HTMLTextAreaElement).value).toBe('Issue練習で分解する');
  });

  it('shows a save error when metadata cannot be persisted', () => {
    renderDetailPanel({ saveError: '自分用メモを保存できませんでした。' });

    expect(screen.getByText('保存できていません')).toBeTruthy();
    expect(screen.getByText('自分用メモを保存できませんでした。')).toBeTruthy();
  });

  it('notifies parent when user metadata changes', () => {
    const onUserMetaChange = vi.fn();
    renderDetailPanel({ userMeta: createMeta(), onUserMetaChange });

    fireEvent.change(screen.getByLabelText('自分の状態'), { target: { value: 'paused' } });
    fireEvent.change(screen.getByLabelText('このリポジトリの目的'), { target: { value: '練習用に整理する' } });
    fireEvent.change(screen.getByLabelText('次にやること'), { target: { value: '小さなTODOに分ける' } });
    fireEvent.change(screen.getByLabelText('メモ'), { target: { value: '焦らず進める' } });

    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { status: 'paused' });
    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { purpose: '練習用に整理する' });
    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { nextAction: '小さなTODOに分ける' });
    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { note: '焦らず進める' });
  });

  it('edits project stage and schedule bucket from the detail panel', () => {
    const onUserMetaChange = vi.fn();
    renderDetailPanel({ userMeta: createMeta(), onUserMetaChange });

    fireEvent.change(screen.getByLabelText('開発段階'), { target: { value: 'testing' } });
    fireEvent.change(screen.getByLabelText('作業予定'), { target: { value: 'next_month' } });

    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { stage: 'testing' });
    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { scheduleBucket: 'next_month' });
  });

  it('toggles progress tracking from the detail panel', () => {
    const onUserMetaChange = vi.fn();
    renderDetailPanel({ userMeta: createMeta(), onUserMetaChange });

    fireEvent.click(screen.getByRole('button', { name: '進捗管理から外す' }));

    expect(onUserMetaChange).toHaveBeenCalledWith('repo-1', { tracked: false });
  });

  it('shows defaults for unsaved metadata', () => {
    renderDetailPanel({ userMeta: null });

    expect((screen.getByLabelText('開発段階') as HTMLSelectElement).value).toBe('unassigned');
    expect((screen.getByLabelText('作業予定') as HTMLSelectElement).value).toBe('unscheduled');
    expect(screen.getByRole('button', { name: '進捗管理に追加' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows saved practice issue drafts inside the repository detail', () => {
    renderDetailPanel({ practiceIssueDrafts: [createPracticeDraft()] });

    expect(screen.getByText('保存済みの下書き')).toBeTruthy();
    expect(screen.getByText('トップページのボタンを見やすくする')).toBeTruthy();
    expect(screen.getByText(/## やりたいこと/)).toBeTruthy();
    expect(screen.getAllByText('DevBoard内だけ').length).toBeGreaterThan(0);
  });

  it('requires confirmation before creating a GitHub Issue from a practice draft', async () => {
    const onCreateGitHubIssueFromDraft = vi.fn().mockResolvedValue(
      createPracticeDraft({
        syncStatus: 'synced',
        githubIssueNumber: 42,
        githubIssueUrl: 'https://github.com/alice/frontend-app/issues/42',
      })
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDetailPanel({
      practiceIssueDrafts: [createPracticeDraft()],
      onCreateGitHubIssueFromDraft,
    });

    fireEvent.click(screen.getByRole('button', { name: 'GitHub Issueを作成' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('GitHub上に実データが作られます'));
    await waitFor(() => expect(onCreateGitHubIssueFromDraft).toHaveBeenCalledWith('draft-1'));
  });

  it('shows a synced GitHub Issue URL instead of the create action', () => {
    renderDetailPanel({
      practiceIssueDrafts: [
        createPracticeDraft({
          syncStatus: 'synced',
          githubIssueNumber: 42,
          githubIssueUrl: 'https://github.com/alice/frontend-app/issues/42',
        }),
      ],
    });

    expect(screen.getByText('GitHub作成済み #42')).toBeTruthy();
    expect(screen.getByText('GitHub Issue: https://github.com/alice/frontend-app/issues/42')).toBeTruthy();
    expect(screen.getByRole('link', { name: '作成済みIssueを開く' }).getAttribute('href')).toBe(
      'https://github.com/alice/frontend-app/issues/42'
    );
    expect(screen.queryByRole('button', { name: 'GitHub Issueを作成' })).toBeNull();
  });

  it('shows saved practice pull request drafts inside the repository detail', () => {
    renderDetailPanel({
      practiceIssueDrafts: [createPracticeDraft()],
      practicePullRequestDrafts: [createPracticePullRequestDraft()],
    });

    expect(screen.getByText('保存済みのPR下書き')).toBeTruthy();
    expect(screen.getByText('READMEに起動手順を追加する')).toBeTruthy();
    expect(screen.getByText(/## 変更の確認リクエスト/)).toBeTruthy();
    expect(screen.getByText('関連: トップページのボタンを見やすくする')).toBeTruthy();
  });

  it('can move from repository detail to the practice draft list', () => {
    const onOpenPracticeHome = vi.fn();
    const onClose = vi.fn();
    renderDetailPanel({
      practiceIssueDrafts: [createPracticeDraft()],
      onOpenPracticeHome,
      onClose,
    });

    fireEvent.click(screen.getByRole('button', { name: '練習一覧で見る' }));

    expect(onOpenPracticeHome).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('starts practice issue drafting from the repository detail without GitHub navigation', () => {
    const onCreatePracticeIssueDraft = vi.fn(() => createPracticeDraft());
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderDetailPanel({ onCreatePracticeIssueDraft });

    const toggleButton = screen.getByRole('button', { name: '下書きを作る' });
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: '作成欄を閉じる' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(screen.getByLabelText('やりたいこと'), { target: { value: 'READMEを書く' } });
    fireEvent.change(screen.getByLabelText('なぜやる？'), { target: { value: '使い方を伝える' } });
    fireEvent.change(screen.getByLabelText('終わりの条件'), { target: { value: '起動手順がある' } });
    fireEvent.click(screen.getByRole('button', { name: '下書きを保存' }));

    expect(onCreatePracticeIssueDraft).toHaveBeenCalledWith({
      title: 'READMEを書く',
      reason: '使い方を伝える',
      doneCriteria: ['起動手順がある'],
    });
    expect(screen.getAllByRole('link', { name: 'alice/frontend-app をGitHubで開く' })).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('starts practice pull request drafting from the repository detail without GitHub navigation', () => {
    const onCreatePracticePullRequestDraft = vi.fn(() => createPracticePullRequestDraft());
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderDetailPanel({
      practiceIssueDrafts: [createPracticeDraft()],
      onCreatePracticePullRequestDraft,
    });

    const toggleButton = screen.getByRole('button', { name: 'PR下書きを作る' });
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: 'PR作成欄を閉じる' }).getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(screen.getByLabelText('PRタイトル'), { target: { value: 'READMEに起動手順を追加する' } });
    fireEvent.change(screen.getByLabelText('関連するやることカード'), { target: { value: 'draft-1' } });
    fireEvent.change(screen.getByLabelText('変更したこと'), { target: { value: 'READMEを更新した' } });
    fireEvent.change(screen.getByLabelText('見てほしいこと'), { target: { value: '手順が初めての人にも分かるか' } });
    fireEvent.click(screen.getByRole('button', { name: 'PR下書きを保存' }));

    expect(onCreatePracticePullRequestDraft).toHaveBeenCalledWith({
      title: 'READMEに起動手順を追加する',
      changedItems: ['READMEを更新した'],
      reviewPoints: ['手順が初めての人にも分かるか'],
      relatedIssueDraftId: 'draft-1',
    });
    expect(screen.getAllByRole('link', { name: 'alice/frontend-app をGitHubで開く' })).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
