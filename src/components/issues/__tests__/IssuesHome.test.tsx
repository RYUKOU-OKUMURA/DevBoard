// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubIssue } from '../../../api/issues';
import type { Repo } from '../../../types';
import { createDefaultRepositoryMeta, getRepositoryMetaMap, saveRepositoryMetaMap } from '../../../storage/repositoryMetaStorage';
import { clearTrackedRepoIssuesCache } from '../../../hooks/useTrackedRepoIssues';
import { IssuesHome } from '../IssuesHome';

const mockFetchIssuesPage = vi.hoisted(() => vi.fn());
const mockFetchRepoLabels = vi.hoisted(() => vi.fn());
const mockUpdateIssue = vi.hoisted(() => vi.fn());
const mockAddIssueComment = vi.hoisted(() => vi.fn());

vi.mock('../../../api/issues', () => ({
  fetchIssuesPage: (...args: unknown[]) => mockFetchIssuesPage(...args),
  fetchRepoLabels: (...args: unknown[]) => mockFetchRepoLabels(...args),
  updateIssue: (...args: unknown[]) => mockUpdateIssue(...args),
  addIssueComment: (...args: unknown[]) => mockAddIssueComment(...args),
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
    updated_at: `2026-01-${String(number).padStart(2, '0')}T00:00:00.000Z`,
    closed_at: null,
    ...overrides,
  };
}

function setTracked(accountId: string, repoId: string, tracked = true): void {
  const meta = createDefaultRepositoryMeta(repoId, '2026-01-01T00:00:00.000Z');
  saveRepositoryMetaMap(accountId, { ...getRepositoryMetaMap(accountId), [repoId]: { ...meta, tracked } });
}

describe('IssuesHome', () => {
  beforeEach(() => {
    localStorage.clear();
    clearTrackedRepoIssuesCache();
    mockFetchIssuesPage.mockReset();
    mockFetchRepoLabels.mockReset();
    mockUpdateIssue.mockReset();
    mockAddIssueComment.mockReset();
    mockFetchIssuesPage.mockResolvedValue({ issues: [], rawCount: 0 });
    mockFetchRepoLabels.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens an in-app detail panel and keeps GitHub navigation on its explicit link', async () => {
    const repo = createRepo('repo-a');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({
      issues: [createIssue(12, { title: 'Show plain text', body: '# Markdown\nhello', html_url: 'https://github.com/alice/repo-a/issues/12' })],
      rawCount: 1,
    });
    const onOpen = vi.fn();
    const openSpy = vi.spyOn(window, 'open');
    const locationBefore = window.location.href;

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={onOpen} />);
    const card = await screen.findByRole('button', { name: 'alice/repo-a #12: Show plain text の詳細を開く' });
    card.focus();
    fireEvent.click(card);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('# Markdown\nhello');
    expect(within(dialog).queryByRole('heading', { name: 'Markdown' })).toBeNull();
    const link = within(dialog).getByRole('link', { name: 'GitHubで開く' });
    expect(link.getAttribute('href')).toBe('https://github.com/alice/repo-a/issues/12');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(openSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(locationBefore);

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(card);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('updates the selected issue and hides a newly closed issue from the default filter', async () => {
    const repo = createRepo('repo-a');
    const openIssue = createIssue(12, { html_url: 'https://github.com/alice/repo-a/issues/12' });
    const closedIssue = createIssue(12, {
      state: 'closed',
      closed_at: '2026-02-01T00:00:00.000Z',
      html_url: 'https://github.com/alice/repo-a/issues/12',
    });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [openIssue], rawCount: 1 });
    mockUpdateIssue.mockResolvedValue(closedIssue);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'このIssueを閉じる（Close）' }));

    expect(mockUpdateIssue).toHaveBeenCalledWith('alice', 'repo-a', 12, { state: 'closed' });
    expect(await screen.findByText('完了（Closed）')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' })).toBeNull();

    fireEvent.change(screen.getByLabelText('状態で絞り込み'), { target: { value: 'closed' } });
    const closedCard = await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' });
    expect(within(closedCard).getByText('完了（Closed）')).toBeTruthy();
  });

  it('explains how to add a tracked repository when there are none', () => {
    const onOpen = vi.fn();
    render(<IssuesHome accountId="alice-id" repos={[createRepo('untracked')]} onOpenRepositories={onOpen} />);

    expect(screen.getByText('リポジトリ画面で「進捗管理に追加」するとここに出ます。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'リポジトリ画面へ' }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(mockFetchIssuesPage).not.toHaveBeenCalled();
  });

  it('changes the displayed count for state, repository, label, and assignee filters', async () => {
    const repoA = createRepo('repo-a');
    const repoB = createRepo('repo-b');
    setTracked('alice-id', repoA.id);
    setTracked('alice-id', repoB.id);
    const label = (name: string) => ({ id: name.length, name, color: '336699' });
    const person = (login: string) => ({ login, avatar_url: '', html_url: `https://github.com/${login}` });
    mockFetchIssuesPage.mockImplementation(async (_owner: string, name: string) => ({
      issues: name === 'repo-a'
        ? [
            createIssue(1, { labels: [label('bug')], assignees: [person('alice')] }),
            createIssue(2, { labels: [label('docs')], assignees: [person('bob')] }),
          ]
        : [createIssue(3, { state: 'closed', labels: [label('bug')], assignees: [person('alice')] })],
      rawCount: name === 'repo-a' ? 2 : 1,
    }));

    render(<IssuesHome accountId="alice-id" repos={[repoA, repoB]} onOpenRepositories={() => undefined} />);
    await screen.findByRole('button', { name: 'alice/repo-a #1: Issue 1 の詳細を開く' });
    expect(screen.getByText('2 件のIssue')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Label（目印）で絞り込み'), { target: { value: 'bug' } });
    expect(screen.getByText('1 件のIssue')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Assignee（担当者）で絞り込み'), { target: { value: 'bob' } });
    expect(screen.getByText('絞り込み条件に一致するIssueはありません。')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('リポジトリで絞り込み'), { target: { value: repoB.id } });
    fireEvent.change(screen.getByLabelText('状態で絞り込み'), { target: { value: 'closed' } });
    fireEvent.change(screen.getByLabelText('Assignee（担当者）で絞り込み'), { target: { value: 'alice' } });

    expect(screen.getByText('1 件のIssue')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'alice/repo-b #3: Issue 3 の詳細を開く' })).toBeTruthy();
  });

  it('shows a separate empty message when tracked repositories have no issues', async () => {
    const repo = createRepo('empty');
    setTracked('alice-id', repo.id);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);

    expect(await screen.findByText('対象リポジトリにIssueはありません。')).toBeTruthy();
  });
});
