// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubIssue } from '../../../api/issues';
import type { Repo } from '../../../types';
import { createDefaultRepositoryMeta, getRepositoryMetaMap, saveRepositoryMetaMap } from '../../../storage/repositoryMetaStorage';
import { getIssueLocalMeta, updateIssueLocalMeta } from '../../../storage/issueLocalMetaStorage';
import { clearTrackedRepoIssuesCache } from '../../../hooks/useTrackedRepoIssues';
import { IssuesHome } from '../IssuesHome';

const mockFetchIssuesPage = vi.hoisted(() => vi.fn());
const mockFetchIssue = vi.hoisted(() => vi.fn());
const mockFetchRepoLabels = vi.hoisted(() => vi.fn());
const mockUpdateIssue = vi.hoisted(() => vi.fn());
const mockAddIssueComment = vi.hoisted(() => vi.fn());

vi.mock('../../../api/issues', () => ({
  fetchIssue: (...args: unknown[]) => mockFetchIssue(...args),
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
    mockFetchIssue.mockReset();
    mockFetchRepoLabels.mockReset();
    mockUpdateIssue.mockReset();
    mockAddIssueComment.mockReset();
    mockFetchIssuesPage.mockResolvedValue({ issues: [], rawCount: 0 });
    mockFetchIssue.mockResolvedValue(createIssue(12));
    mockFetchRepoLabels.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
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

  it('saves local issue metadata and restores it when the detail panel is reopened', async () => {
    const repo = createRepo('repo-a');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(12)], rawCount: 1 });
    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('優先度'), { target: { value: 'high' } });
    fireEvent.change(within(dialog).getByLabelText('期限'), { target: { value: '2026-12-31' } });
    fireEvent.change(within(dialog).getByLabelText('自分メモ'), { target: { value: 'ローカルメモ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));

    expect(await screen.findByText('保存しました')).toBeTruthy();
    expect(getIssueLocalMeta('alice-id', repo.id, 12)).toMatchObject({
      priority: 'high', dueDate: '2026-12-31', note: 'ローカルメモ',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: '詳細パネルを閉じる' }));
    fireEvent.click(screen.getByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));

    const reopenedDialog = screen.getByRole('dialog');
    expect((within(reopenedDialog).getByLabelText('優先度') as HTMLSelectElement).value).toBe('high');
    expect((within(reopenedDialog).getByLabelText('期限') as HTMLInputElement).value).toBe('2026-12-31');
    expect((within(reopenedDialog).getByLabelText('自分メモ') as HTMLTextAreaElement).value).toBe('ローカルメモ');
  });

  it('mounts with mixed malformed legacy todos and migrates the valid todo', async () => {
    const repo = createRepo('repo-a');
    setTracked('alice-id', repo.id);
    localStorage.setItem('github-dashboard-todos:alice-id', JSON.stringify([
      null,
      42,
      'x',
      { repoId: 'repo-a' },
      {
        repoId: repo.id, issueNumber: 12, priority: 'high', dueDate: '2026-09-24',
        description: 'migrated memo', updatedAt: '2026-09-20T00:00:00.000Z',
      },
    ]));
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(12)], rawCount: 1 });

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);

    const card = await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' });
    expect(card.textContent).toContain('優先度: 高');
    expect(card.textContent).toContain('期限: 2026-09-24');
    expect(getIssueLocalMeta('alice-id', repo.id, 12)).toMatchObject({ note: 'migrated memo' });
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

    fireEvent.change(screen.getByLabelText('優先度で絞り込み'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('状態で絞り込み'), { target: { value: 'closed' } });
    const closedCard = await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' });
    expect(within(closedCard).getByText('完了（Closed）')).toBeTruthy();
  });

  it('shows labels from a newer reload and starts an untouched draft from them', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const urgent = { id: 2, name: 'urgent', color: 'ff9900' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    const initialIssue = createIssue(12, { labels: [bug] });
    const latestIssue = createIssue(12, { labels: [bug, urgent] });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({ issues: [initialIssue], rawCount: 1 })
      .mockResolvedValueOnce({ issues: [latestIssue], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, urgent, docs]);
    mockFetchIssue.mockResolvedValue(latestIssue);
    mockUpdateIssue.mockResolvedValue(createIssue(12, { labels: [bug, urgent, docs] }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    await screen.findByRole('checkbox', { name: 'docs' });
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));

    expect(await screen.findByText('bug、urgent')).toBeTruthy();
    await waitFor(() => expect((screen.getByRole('checkbox', { name: 'urgent' }) as HTMLInputElement).checked).toBe(true));
    fireEvent.click(screen.getByRole('checkbox', { name: 'docs' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    await waitFor(() => expect(mockUpdateIssue).toHaveBeenCalledWith(
      'alice',
      'repo-a',
      12,
      { labels: ['bug', 'urgent', 'docs'] }
    ));
  });

  it('preserves a label added by a newer GET while another label is being edited', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const urgent = { id: 2, name: 'urgent', color: 'ff9900' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    const initialIssue = createIssue(12, { labels: [bug] });
    const latestIssue = createIssue(12, { labels: [bug, urgent] });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({ issues: [initialIssue], rawCount: 1 })
      .mockResolvedValueOnce({ issues: [latestIssue], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, urgent, docs]);
    mockFetchIssue.mockResolvedValue(latestIssue);
    mockUpdateIssue.mockResolvedValue(createIssue(12, { labels: [bug, urgent, docs] }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'docs' }));
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));

    expect(await screen.findByText('bug、urgent')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    await waitFor(() => expect(mockUpdateIssue).toHaveBeenCalledWith(
      'alice',
      'repo-a',
      12,
      { labels: ['bug', 'urgent', 'docs'] }
    ));
  });

  it('merges label additions into the latest GitHub labels before saving', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const urgent = { id: 2, name: 'urgent', color: 'ff9900' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    const initialIssue = createIssue(12, { labels: [bug] });
    const latestIssue = createIssue(12, { labels: [bug, urgent] });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [initialIssue], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, urgent, docs]);
    mockFetchIssue.mockResolvedValue(latestIssue);
    mockUpdateIssue.mockResolvedValue(createIssue(12, { labels: [bug, urgent, docs] }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'docs' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    await waitFor(() => expect(mockFetchIssue).toHaveBeenCalledWith('alice', 'repo-a', 12));
    expect(mockUpdateIssue).toHaveBeenCalledWith('alice', 'repo-a', 12, {
      labels: ['bug', 'urgent', 'docs'],
    });
  });

  it('applies label removals to the latest GitHub labels without adding the draft labels', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const urgent = { id: 2, name: 'urgent', color: 'ff9900' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    const initialIssue = createIssue(12, { labels: [bug] });
    const latestIssue = createIssue(12, { labels: [bug, urgent] });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [initialIssue], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, urgent, docs]);
    mockFetchIssue.mockResolvedValue(latestIssue);
    mockUpdateIssue.mockResolvedValue(createIssue(12, { labels: [urgent] }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'bug' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    await waitFor(() => expect(mockUpdateIssue).toHaveBeenCalledWith('alice', 'repo-a', 12, {
      labels: ['urgent'],
    }));
  });

  it('refreshes labels without PATCH when the latest issue already matches the draft', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const urgent = { id: 2, name: 'urgent', color: 'ff9900' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    const initialIssue = createIssue(12, { labels: [bug, urgent] });
    const latestIssue = createIssue(12, { labels: [bug, docs] });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [initialIssue], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, urgent, docs]);
    mockFetchIssue.mockResolvedValue(latestIssue);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'urgent' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'docs' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    expect((await screen.findByRole('status')).textContent).toContain('変更はありませんでした');
    expect(within(screen.getByRole('dialog')).getByText('bug、docs')).toBeTruthy();
    expect(mockFetchIssue).toHaveBeenCalledWith('alice', 'repo-a', 12);
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it('does not PATCH labels when fetching the latest issue fails', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(12, { labels: [bug] })], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, docs]);
    mockFetchIssue.mockRejectedValueOnce(new Error('API request failed with status 500'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'docs' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    expect((await screen.findByRole('alert')).textContent).toContain('ラベルを保存することができませんでした');
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it('does not fetch the latest issue when label saving is cancelled', async () => {
    const repo = createRepo('repo-a');
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const docs = { id: 3, name: 'docs', color: '0000ff' };
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(12, { labels: [bug] })], rawCount: 1 });
    mockFetchRepoLabels.mockResolvedValue([bug, docs]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: 'docs' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    await waitFor(() => expect((screen.getByRole('button', { name: 'ラベルを保存' }) as HTMLButtonElement).disabled).toBe(false));
    expect(mockFetchIssue).not.toHaveBeenCalled();
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it('keeps a comment submission locked when the detail panel is reopened', async () => {
    const repo = createRepo('repo-a');
    const issue = createIssue(12, { comments: 2, html_url: 'https://github.com/alice/repo-a/issues/12' });
    let resolveComment: (comment: { id: number; body: string; created_at: string }) => void = () => undefined;
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [issue], rawCount: 1 });
    mockAddIssueComment.mockReturnValueOnce(new Promise((resolve) => { resolveComment = resolve; }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const firstView = render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    const cardName = 'alice/repo-a #12: Issue 12 の詳細を開く';
    fireEvent.click(await screen.findByRole('button', { name: cardName }));
    fireEvent.change(screen.getByLabelText('コメント本文'), { target: { value: 'One comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));
    await waitFor(() => expect(mockAddIssueComment).toHaveBeenCalledTimes(1));

    firstView.unmount();
    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: cardName }));
    fireEvent.change(screen.getByLabelText('コメント本文'), { target: { value: 'One comment' } });

    const lockedSubmit = screen.getByRole('button', { name: '投稿中…' }) as HTMLButtonElement;
    expect(lockedSubmit.disabled).toBe(true);
    fireEvent.click(lockedSubmit);
    expect(mockAddIssueComment).toHaveBeenCalledTimes(1);

    await act(async () => resolveComment({
      id: 20,
      body: 'One comment',
      created_at: '2026-01-13T00:00:00.000Z',
    }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'コメントを投稿' })).toBeTruthy());
    fireEvent.change(screen.getByLabelText('コメント本文'), { target: { value: 'Next comment' } });
    expect((screen.getByRole('button', { name: 'コメントを投稿' }) as HTMLButtonElement).disabled).toBe(false);
    expect(mockAddIssueComment).toHaveBeenCalledTimes(1);
  });

  it('releases the issue action lock after a failed comment', async () => {
    const repo = createRepo('repo-a');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(12)], rawCount: 1 });
    mockAddIssueComment
      .mockRejectedValueOnce(new Error('API request failed with status 500'))
      .mockResolvedValueOnce({ id: 21, body: 'Retry', created_at: '2026-01-13T00:00:00.000Z' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    const commentInput = screen.getByLabelText('コメント本文');
    fireEvent.change(commentInput, { target: { value: 'Retry' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));

    expect((await screen.findByRole('alert')).textContent).toContain('コメントを投稿することができませんでした');
    const retryButton = screen.getByRole('button', { name: 'コメントを投稿' }) as HTMLButtonElement;
    expect(retryButton.disabled).toBe(false);
    fireEvent.click(retryButton);
    expect(await screen.findByText('1 件')).toBeTruthy();
    expect(mockAddIssueComment).toHaveBeenCalledTimes(2);
  });

  it('restores an issue after a successful comment when reload excluded it', async () => {
    const repo = createRepo('repo-a');
    const issue = createIssue(12, { comments: 2 });
    let resolveComment: (comment: { id: number; body: string; created_at: string }) => void = () => undefined;
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({ issues: [issue], rawCount: 1 })
      .mockResolvedValueOnce({ issues: [], rawCount: 0 });
    mockAddIssueComment.mockReturnValueOnce(new Promise((resolve) => { resolveComment = resolve; }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.change(screen.getByLabelText('コメント本文'), { target: { value: 'One comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));
    await waitFor(() => expect(mockAddIssueComment).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', {
      name: 'alice/repo-a #12: Issue 12 の詳細を開く',
    })).toBeNull());

    await act(async () => resolveComment({
      id: 20,
      body: 'One comment',
      created_at: '2026-02-01T00:00:00.000Z',
    }));

    expect(await screen.findByText('3 件')).toBeTruthy();
    expect((screen.getByLabelText('コメント本文') as HTMLTextAreaElement).value).toBe('');
    expect(screen.getByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' })).toBeTruthy();
  });

  it('keeps a label candidate error after a comment succeeds and never submits labels', async () => {
    const repo = createRepo('repo-a');
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [createIssue(12)], rawCount: 1 });
    mockFetchRepoLabels.mockRejectedValueOnce(new Error('API request failed with status 404'));
    mockAddIssueComment.mockResolvedValueOnce({ id: 20, body: 'Comment', created_at: '2026-02-01T00:00:00.000Z' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    expect((await screen.findByRole('alert')).textContent).toContain('ラベル候補を取得することができませんでした');

    fireEvent.change(screen.getByLabelText('コメント本文'), { target: { value: 'Comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));
    expect(await screen.findByText('1 件')).toBeTruthy();
    expect((screen.getByRole('alert').textContent ?? '')).toContain('ラベル候補を取得することができませんでした');
    expect(screen.queryByRole('button', { name: 'ラベルを保存' })).toBeNull();
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it('adds each sequential successful comment to the latest count', async () => {
    const repo = createRepo('repo-a');
    const issue = createIssue(12, { comments: 2, html_url: 'https://github.com/alice/repo-a/issues/12' });
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage.mockResolvedValue({ issues: [issue], rawCount: 1 });
    mockAddIssueComment
      .mockResolvedValueOnce({ id: 20, body: 'First', created_at: issue.updated_at })
      .mockResolvedValueOnce({ id: 21, body: 'Second', created_at: issue.updated_at });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    const textarea = screen.getByLabelText('コメント本文');
    fireEvent.change(textarea, { target: { value: 'First' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));
    expect(await screen.findByText('3 件')).toBeTruthy();

    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''));
    fireEvent.change(textarea, { target: { value: 'Second' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));
    expect(await screen.findByText('4 件')).toBeTruthy();
    expect(mockAddIssueComment).toHaveBeenCalledTimes(2);
  });

  it('does not double-count a comment when a reload already includes it', async () => {
    const repo = createRepo('repo-a');
    const issue = createIssue(12, { comments: 2, html_url: 'https://github.com/alice/repo-a/issues/12' });
    const reloadedIssue = createIssue(12, { comments: 3, updated_at: '2026-02-01T00:00:00.000Z' });
    let resolveComment: (comment: { id: number; body: string; created_at: string }) => void = () => undefined;
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({ issues: [issue], rawCount: 1 })
      .mockResolvedValueOnce({ issues: [reloadedIssue], rawCount: 1 });
    mockAddIssueComment.mockReturnValueOnce(new Promise((resolve) => { resolveComment = resolve; }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    fireEvent.change(screen.getByLabelText('コメント本文'), { target: { value: 'One comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));
    await waitFor(() => expect(mockAddIssueComment).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('3 件')).toBeTruthy();

    await act(async () => resolveComment({
      id: 20,
      body: 'One comment',
      created_at: '2026-02-02T00:00:00.000Z',
    }));

    expect(within(screen.getByRole('dialog')).getByText('3 件')).toBeTruthy();
  });

  it('keeps a local close over a stale reload in the panel, list, and cache', async () => {
    let now = 1_800_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const repo = createRepo('repo-a');
    const openIssue = createIssue(12, { updated_at: '2026-01-01T00:00:00.000Z', html_url: 'https://github.com/alice/repo-a/issues/12' });
    const closedIssue = createIssue(12, {
      state: 'closed',
      closed_at: '2026-02-01T00:00:00.000Z',
      updated_at: openIssue.updated_at,
      html_url: 'https://github.com/alice/repo-a/issues/12',
    });
    let resolveReload: (result: { issues: GitHubIssue[]; rawCount: number }) => void = () => undefined;
    setTracked('alice-id', repo.id);
    mockFetchIssuesPage
      .mockResolvedValueOnce({ issues: [openIssue], rawCount: 1 })
      .mockReturnValueOnce(new Promise((resolve) => { resolveReload = resolve; }));
    mockUpdateIssue.mockResolvedValueOnce(closedIssue);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const view = render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    now += 5 * 60 * 1000;
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }));
    await waitFor(() => expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'このIssueを閉じる（Close）' }));
    expect(await screen.findByText('完了（Closed）')).toBeTruthy();

    await act(async () => resolveReload({ issues: [openIssue], rawCount: 1 }));
    await screen.findByRole('button', { name: '再読み込み' });
    expect(within(screen.getByRole('dialog')).getByText('完了（Closed）')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('状態で絞り込み'), { target: { value: 'closed' } });
    expect(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' })).toBeTruthy();

    view.unmount();
    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    fireEvent.change(screen.getByLabelText('状態で絞り込み'), { target: { value: 'closed' } });
    expect(await screen.findByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'alice/repo-a #12: Issue 12 の詳細を開く' }));
    expect(within(screen.getByRole('dialog')).getByText('完了（Closed）')).toBeTruthy();
    expect(mockFetchIssuesPage).toHaveBeenCalledTimes(2);
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

  it('groups issues by repository when the repository view is selected', async () => {
    const repoA = createRepo('repo-a');
    const repoB = createRepo('repo-b');
    setTracked('alice-id', repoA.id);
    setTracked('alice-id', repoB.id);
    mockFetchIssuesPage.mockImplementation(async (_owner: string, name: string) => ({
      issues: name === 'repo-a' ? [createIssue(1), createIssue(2)] : [createIssue(3)],
      rawCount: name === 'repo-a' ? 2 : 1,
    }));

    render(<IssuesHome accountId="alice-id" repos={[repoA, repoB]} onOpenRepositories={() => undefined} />);
    await screen.findByRole('button', { name: 'alice/repo-a #1: Issue 1 の詳細を開く' });
    expect(screen.getByRole('button', { name: 'リスト' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'リポジトリ別' }));

    const groupA = screen.getByRole('region', { name: 'alice/repo-a のIssue' });
    const groupB = screen.getByRole('region', { name: 'alice/repo-b のIssue' });
    expect(within(groupA).getAllByRole('listitem')).toHaveLength(2);
    expect(within(groupA).getByText('2 件')).toBeTruthy();
    expect(within(groupB).getByRole('button', { name: 'alice/repo-b #3: Issue 3 の詳細を開く' })).toBeTruthy();
  });

  it('shows priority and due status, filters by priority, and does not emphasize closed deadlines', async () => {
    vi.stubEnv('TZ', 'Asia/Tokyo');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T15:30:00.000Z'));
    const repo = createRepo('repo-a');
    setTracked('alice-id', repo.id);
    const todayText = '2026-09-24';
    const yesterdayText = '2026-09-23';
    updateIssueLocalMeta('alice-id', repo.id, 1, { priority: 'high', dueDate: yesterdayText });
    updateIssueLocalMeta('alice-id', repo.id, 2, { priority: 'medium', dueDate: todayText });
    updateIssueLocalMeta('alice-id', repo.id, 4, { priority: 'low', dueDate: '2000-01-01' });
    mockFetchIssuesPage.mockResolvedValue({
      issues: [createIssue(1), createIssue(2), createIssue(3), createIssue(4, { state: 'closed' })],
      rawCount: 4,
    });

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    const overdueCard = screen.getByRole('button', { name: 'alice/repo-a #1: Issue 1 の詳細を開く' });
    const todayCard = screen.getByRole('button', { name: 'alice/repo-a #2: Issue 2 の詳細を開く' });
    expect(overdueCard.textContent).toContain('優先度: 高');
    expect(overdueCard.textContent).toContain(`期限: ${yesterdayText}（期限切れ）`);
    expect(todayCard.textContent).toContain('優先度: 中');
    expect(todayCard.textContent).toContain(`期限: ${todayText}（今日まで）`);
    expect(screen.getByText('3 件のIssue')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('優先度で絞り込み'), { target: { value: 'high' } });
    expect(screen.getByText('1 件のIssue')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('優先度で絞り込み'), { target: { value: 'unset' } });
    expect(screen.getByRole('button', { name: 'alice/repo-a #3: Issue 3 の詳細を開く' })).toBeTruthy();
    expect(screen.getByText('1 件のIssue')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('優先度で絞り込み'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('状態で絞り込み'), { target: { value: 'closed' } });
    const closedCard = screen.getByRole('button', { name: 'alice/repo-a #4: Issue 4 の詳細を開く' });
    expect(closedCard.textContent).toContain('期限: 2000-01-01');
    expect(closedCard.textContent).not.toContain('期限切れ');
  });

  it('shows a separate empty message when tracked repositories have no issues', async () => {
    const repo = createRepo('empty');
    setTracked('alice-id', repo.id);

    render(<IssuesHome accountId="alice-id" repos={[repo]} onOpenRepositories={() => undefined} />);

    expect(await screen.findByText('対象リポジトリにIssueはありません。')).toBeTruthy();
  });
});
