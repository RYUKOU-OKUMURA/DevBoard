// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubIssue } from '../../../api/issues';
import type { IssueAction } from '../../../hooks/useIssueActions';
import type { TrackedIssueUpdate } from '../../../hooks/useTrackedRepoIssues';
import type { Repo } from '../../../types';
import { IssueDetailPanel } from '../IssueDetailPanel';

const mockFetchIssue = vi.hoisted(() => vi.fn());
const mockFetchRepoLabels = vi.hoisted(() => vi.fn());
const mockUpdateIssue = vi.hoisted(() => vi.fn());
const mockAddIssueComment = vi.hoisted(() => vi.fn());

vi.mock('../../../api/issues', () => ({
  fetchIssue: (...args: unknown[]) => mockFetchIssue(...args),
  fetchRepoLabels: (...args: unknown[]) => mockFetchRepoLabels(...args),
  updateIssue: (...args: unknown[]) => mockUpdateIssue(...args),
  addIssueComment: (...args: unknown[]) => mockAddIssueComment(...args),
}));

function createRepo(): Repo {
  return {
    id: 'repo-id',
    nameWithOwner: 'alice/repo',
    htmlUrl: 'https://github.com/alice/repo',
    pushedAt: '2026-01-01T00:00:00.000Z',
    isArchived: false,
    isPrivate: false,
    topics: [],
  };
}

function createIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    id: 1,
    number: 12,
    title: 'Fix the widget',
    body: 'Description',
    state: 'open',
    html_url: 'https://github.com/alice/repo/issues/12',
    user: { login: 'alice', avatar_url: '', html_url: 'https://github.com/alice' },
    assignees: [],
    labels: [],
    comments: 2,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    closed_at: null,
    ...overrides,
  };
}

function renderPanel(initialIssue = createIssue()) {
  const onIssueUpdated = vi.fn();
  function Harness() {
    const [issue, setIssue] = useState(initialIssue);
    const [pendingAction, setPendingAction] = useState<IssueAction | null>(null);
    const actionLock = useRef(false);
    return (
      <IssueDetailPanel
        item={{ repo: createRepo(), issue }}
        onClose={() => undefined}
        pendingAction={pendingAction}
        beginAction={(_repoId, _issueNumber, action) => {
          if (actionLock.current) return false;
          actionLock.current = true;
          setPendingAction(action);
          return true;
        }}
        endAction={() => {
          actionLock.current = false;
          setPendingAction(null);
        }}
        onIssueUpdated={(repoId, _issueId, update: TrackedIssueUpdate) => {
          const updatedIssue = typeof update === 'function' ? update(issue) : update;
          onIssueUpdated(repoId, updatedIssue);
          setIssue(updatedIssue);
          return updatedIssue;
        }}
      />
    );
  }
  render(<Harness />);
  return { onIssueUpdated };
}

describe('IssueDetailPanel actions', () => {
  beforeEach(() => {
    mockFetchIssue.mockReset();
    mockFetchRepoLabels.mockReset();
    mockUpdateIssue.mockReset();
    mockAddIssueComment.mockReset();
    mockFetchIssue.mockResolvedValue(createIssue());
    mockFetchRepoLabels.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not close an issue when confirmation is cancelled', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'このIssueを閉じる（Close）' }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Close（Issueを閉じる）'));
    expect(confirm.mock.calls[0]?.[0]).toContain('alice/repo');
    expect(confirm.mock.calls[0]?.[0]).toContain('#12');
    expect(confirm.mock.calls[0]?.[0]).toContain('Fix the widget');
    expect(confirm.mock.calls[0]?.[0]).toContain('GitHub上のデータが変わります');
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it('closes an issue once while a request is pending, then allows reopening', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const closedIssue = createIssue({ state: 'closed', closed_at: '2026-02-01T00:00:00.000Z' });
    let resolveClose: (issue: GitHubIssue) => void = () => undefined;
    mockUpdateIssue.mockReturnValueOnce(new Promise<GitHubIssue>((resolve) => { resolveClose = resolve; }));
    const { onIssueUpdated } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'このIssueを閉じる（Close）' }));
    fireEvent.click(screen.getByRole('button', { name: '処理中…' }));

    expect(mockUpdateIssue).toHaveBeenCalledTimes(1);
    expect(mockUpdateIssue).toHaveBeenCalledWith('alice', 'repo', 12, { state: 'closed' });
    expect((screen.getByRole('button', { name: '処理中…' }) as HTMLButtonElement).disabled).toBe(true);
    resolveClose(closedIssue);
    expect(await screen.findByText('完了（Closed）')).toBeTruthy();
    expect(onIssueUpdated).toHaveBeenCalledWith('repo-id', closedIssue);

    const reopenedIssue = createIssue({ state: 'open', closed_at: null });
    mockUpdateIssue.mockResolvedValueOnce(reopenedIssue);
    fireEvent.click(screen.getByRole('button', { name: 'もう一度開く（Reopen）' }));
    await screen.findByRole('button', { name: 'このIssueを閉じる（Close）' });
    expect(mockUpdateIssue).toHaveBeenLastCalledWith('alice', 'repo', 12, { state: 'open' });
    expect(screen.getByText('未完了（Open）')).toBeTruthy();
  });

  it('does not post a blank or cancelled comment, and clears it after success', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { onIssueUpdated } = renderPanel();
    const textarea = screen.getByLabelText('コメント本文');
    const submit = screen.getByRole('button', { name: 'コメントを投稿' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(textarea, { target: { value: '   \n ' } });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(textarea, { target: { value: 'Please check the fix.' } });
    fireEvent.click(submit);
    expect(mockAddIssueComment).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toBe('Please check the fix.');

    mockAddIssueComment.mockResolvedValueOnce({
      id: 44,
      body: 'Please check the fix.',
      created_at: '2026-02-02T00:00:00.000Z',
    });
    fireEvent.click(submit);
    await waitFor(() => expect(mockAddIssueComment).toHaveBeenCalledTimes(1));
    expect(mockAddIssueComment).toHaveBeenCalledWith('alice', 'repo', 12, 'Please check the fix.');
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''));
    expect(screen.getByText('3 件')).toBeTruthy();
    expect(onIssueUpdated).toHaveBeenCalledWith('repo-id', expect.objectContaining({ comments: 3 }));
    expect(confirm.mock.calls[1]?.[0]).toContain('Please check the fix.');
    expect(confirm.mock.calls[1]?.[0]).toContain('GitHub上のデータが変わります');
  });

  it('saves selected labels only after confirmation and shows the returned labels', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const labels = [
      { id: 1, name: 'bug', color: 'ff0000' },
      { id: 2, name: 'docs', color: '00ff00' },
    ];
    mockFetchRepoLabels.mockResolvedValueOnce(labels);
    const updatedIssue = createIssue({ labels });
    const { onIssueUpdated } = renderPanel(createIssue({ labels: [labels[0]!] }));
    mockFetchIssue.mockResolvedValueOnce(createIssue({ labels: [labels[0]!] }));

    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    const docs = await screen.findByRole('checkbox', { name: 'docs' });
    expect((screen.getByRole('checkbox', { name: 'bug' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(docs);
    const save = screen.getByRole('button', { name: 'ラベルを保存' });
    fireEvent.click(save);
    expect(mockUpdateIssue).not.toHaveBeenCalled();
    expect((docs as HTMLInputElement).checked).toBe(true);
    expect(confirm.mock.calls[0]?.[0]).toContain('追加: docs');

    mockUpdateIssue.mockResolvedValueOnce(updatedIssue);
    fireEvent.click(save);
    await waitFor(() => expect(mockUpdateIssue).toHaveBeenCalledTimes(1));
    expect(mockUpdateIssue).toHaveBeenCalledWith('alice', 'repo', 12, { labels: ['bug', 'docs'] });
    expect(await screen.findByText('bug、docs')).toBeTruthy();
    expect(onIssueUpdated).toHaveBeenCalledWith('repo-id', updatedIssue);
  });

  it('shows a Japanese error and preserves the comment after a write fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockAddIssueComment.mockRejectedValueOnce(new Error('API request failed with status 403'));
    renderPanel();
    const textarea = screen.getByLabelText('コメント本文');
    fireEvent.change(textarea, { target: { value: 'Keep this comment' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントを投稿' }));

    expect((await screen.findByRole('alert')).textContent).toContain('書き込み権限とOAuth権限');
    expect((textarea as HTMLTextAreaElement).value).toBe('Keep this comment');
    expect(screen.getByText('2 件')).toBeTruthy();
  });

  it('keeps selected labels after a failed label update', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const bug = { id: 1, name: 'bug', color: 'ff0000' };
    const docs = { id: 2, name: 'docs', color: '00ff00' };
    mockFetchRepoLabels.mockResolvedValueOnce([bug, docs]);
    mockFetchIssue.mockResolvedValueOnce(createIssue({ labels: [bug] }));
    mockUpdateIssue.mockRejectedValueOnce(new Error('API request failed with status 422'));
    renderPanel(createIssue({ labels: [bug] }));

    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));
    const docsCheckbox = await screen.findByRole('checkbox', { name: 'docs' });
    fireEvent.click(docsCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'ラベルを保存' }));

    expect((await screen.findByRole('alert')).textContent).toContain('入力内容（ラベル名など）');
    expect((docsCheckbox as HTMLInputElement).checked).toBe(true);
    expect(screen.getAllByText('bug')).toHaveLength(2);
  });

  it('shows an error and disables label saving when label candidates fail', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockFetchRepoLabels.mockRejectedValueOnce(new Error('API request failed with status 404'));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'ラベルを編集' }));

    expect((await screen.findByRole('alert')).textContent).toContain('対象のIssueまたはリポジトリが見つからない');
    expect(screen.queryByRole('button', { name: 'ラベルを保存' })).toBeNull();
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it.each([
    ['401', '再ログイン'],
    ['403', '書き込み権限とOAuth権限'],
    ['404', '見つからないか、アクセス権'],
    ['422', '入力内容（ラベル名など）'],
    ['429', '時間を置いて再試行'],
    ['500', '時間を置いて再試行'],
  ])('maps HTTP %s to a Japanese close error without changing issue state', async (status, expected) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUpdateIssue.mockRejectedValueOnce(new Error(`API request failed with status ${status}`));
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'このIssueを閉じる（Close）' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Issueを閉じることができませんでした');
    expect(alert.textContent).toContain(expected);
    expect(screen.getByText('未完了（Open）')).toBeTruthy();
  });
});
