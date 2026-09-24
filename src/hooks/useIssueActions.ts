import { useCallback, useState } from 'react';
import { addIssueComment, updateIssue, type GitHubIssue } from '../api/issues';
import type { IssueAction, TrackedIssueUpdate, TrackedRepoIssueItem } from './useTrackedRepoIssues';

export type { IssueAction } from './useTrackedRepoIssues';

function parseRepoNameWithOwner(nameWithOwner: string): { owner: string; repo: string } {
  const [owner, ...repoParts] = nameWithOwner.split('/');
  const repo = repoParts.join('/');
  if (!owner || !repo) throw new Error('Invalid repository nameWithOwner.');
  return { owner, repo };
}

function toJapaneseIssueActionError(operation: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : '';
  const status = message.match(/status\s+(\d{3})/i)?.[1];
  const prefix = `${operation}ことができませんでした。`;

  if (status === '401' || message.includes('Authentication required')) {
    return `${prefix}GitHubの認証が切れている可能性があります。再ログインしてからお試しください。`;
  }
  if (errorName === 'RateLimitError' || status === '429' || message.toLowerCase().includes('rate limit')) {
    return `${prefix}アクセスが集中しています。時間を置いて再試行してください。`;
  }
  if (status === '403') {
    return `${prefix}リポジトリへの書き込み権限とOAuth権限を確認してください。`;
  }
  if (status === '404') {
    return `${prefix}対象のIssueまたはリポジトリが見つからないか、アクセス権がありません。`;
  }
  if (status === '422') {
    return `${prefix}入力内容（ラベル名など）を確認してください。`;
  }
  return `${prefix}時間を置いて再試行してください。`;
}

interface IssueActionsOptions {
  item: TrackedRepoIssueItem;
  pendingAction: IssueAction | null;
  beginAction: (repoId: string, issueNumber: number, action: IssueAction) => boolean;
  endAction: (repoId: string, issueNumber: number) => void;
  onIssueUpdated: (
    repoId: string,
    issueId: number,
    update: TrackedIssueUpdate,
    fallbackIssue: GitHubIssue
  ) => GitHubIssue | null;
}

export function useIssueActions({
  item,
  pendingAction,
  beginAction,
  endAction,
  onIssueUpdated,
}: IssueActionsOptions) {
  const { issue, repo } = item;
  const [error, setError] = useState<string | null>(null);
  const [labelsError, setLabelsError] = useState<string | null>(null);

  const runAction = useCallback(async (
    action: IssueAction,
    operation: string,
    description: string,
    request: () => Promise<TrackedIssueUpdate>
  ): Promise<GitHubIssue | null> => {
    if (!beginAction(repo.id, issue.number, action)) return null;

    try {
      const confirmed = window.confirm([
        description,
        '',
        `リポジトリ名: ${repo.nameWithOwner}`,
        `Issue番号: #${issue.number}`,
        `タイトル: ${issue.title}`,
        '',
        'GitHub上のデータが変わります。続けますか？',
      ].join('\n'));
      if (!confirmed) return null;

      setError(null);
      const update = await request();
      const fallbackIssue = typeof update === 'function' ? update(issue) : update;
      return onIssueUpdated(repo.id, issue.id, update, issue) ?? fallbackIssue;
    } catch (actionError) {
      setError(toJapaneseIssueActionError(operation, actionError));
      return null;
    } finally {
      endAction(repo.id, issue.number);
    }
  }, [beginAction, endAction, issue.id, issue.number, issue.title, onIssueUpdated, repo.id, repo.nameWithOwner]);

  const changeState = useCallback(() => {
    const state = issue.state === 'open' ? 'closed' : 'open';
    const actionText = state === 'closed' ? 'Close（Issueを閉じる）' : 'Reopen（Issueを再オープンする）';
    const operation = state === 'closed' ? 'Issueを閉じる' : 'Issueを再オープンする';
    return runAction(
      'state',
      operation,
      `${actionText}を実行します。`,
      () => {
        const { owner, repo: repoName } = parseRepoNameWithOwner(repo.nameWithOwner);
        return updateIssue(owner, repoName, issue.number, { state });
      }
    );
  }, [issue.number, issue.state, repo.nameWithOwner, runAction]);

  const postComment = useCallback((body: string) => {
    if (!body.trim()) return Promise.resolve(null);
    const preview = body.trim().replace(/\s+/g, ' ').slice(0, 40);
    const commentText = preview.length < body.trim().replace(/\s+/g, ' ').length ? `${preview}…` : preview;
    return runAction(
      'comment',
      'コメントを投稿する',
      `Comment（コメント）を投稿します。\nコメント: ${commentText}`,
      async () => {
        const { owner, repo: repoName } = parseRepoNameWithOwner(repo.nameWithOwner);
        const comment = await addIssueComment(owner, repoName, issue.number, body);
        return (current: GitHubIssue) => ({
          ...current,
          comments: current.comments + 1,
          updated_at: comment.created_at,
        });
      }
    );
  }, [issue, repo.nameWithOwner, runAction]);

  const saveLabels = useCallback((labelNames: string[], baselineLabelNames: string[]) => {
    const current = new Set(issue.labels.map((label) => label.name));
    const baseline = new Set(baselineLabelNames);
    const selected = new Set(labelNames);
    const added = [...selected].filter((name) => !baseline.has(name));
    const removed = [...baseline].filter((name) => !selected.has(name));
    const merged = new Set(current);
    removed.forEach((name) => merged.delete(name));
    added.forEach((name) => merged.add(name));
    if (added.length === 0 && removed.length === 0) return Promise.resolve(null);
    return runAction(
      'labels',
      'ラベルを保存する',
      [
        'Label（目印）を保存します。',
        `追加: ${added.length > 0 ? added.join('、') : 'なし'}`,
        `外す: ${removed.length > 0 ? removed.join('、') : 'なし'}`,
      ].join('\n'),
      () => {
        const { owner, repo: repoName } = parseRepoNameWithOwner(repo.nameWithOwner);
        return updateIssue(owner, repoName, issue.number, { labels: [...merged] });
      }
    );
  }, [issue, repo.nameWithOwner, runAction]);

  const loadLabelsError = useCallback((error: unknown) => {
    setLabelsError(toJapaneseIssueActionError('ラベル候補を取得する', error));
  }, []);
  const clearLabelsError = useCallback(() => setLabelsError(null), []);

  return {
    changeState,
    postComment,
    saveLabels,
    loadLabelsError,
    clearLabelsError,
    pendingAction,
    error,
    labelsError,
  };
}
