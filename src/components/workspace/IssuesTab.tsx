/**
 * IssuesTab - GitHub Issues management tab for workspace
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createIssue, fetchIssues, type GitHubIssue } from '../../api/issues';
import { focusRing } from '../../lib/focusRing';
import { timeAgo } from '../../lib/timeAgo';
import { GlassModal } from '../ui/GlassModal';

interface IssuesTabProps {
  owner: string;
  repo: string;
  onIssueSelect?: (issue: GitHubIssue) => void;
}

type IssueFilter = 'open' | 'closed' | 'all';

export const IssuesTab: React.FC<IssuesTabProps> = ({
  owner,
  repo,
  onIssueSelect,
}) => {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<IssueFilter>('open');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createBody, setCreateBody] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadIssues = useCallback(
    async (options?: { silent?: boolean }) => {
      const isSilent = options?.silent ?? false;
      if (!isSilent) {
        setIsLoading(true);
      }
      setError(null);
      
      try {
        const data = await fetchIssues(owner, repo, {
          state: filter,
          per_page: 30,
          sort: 'updated',
          direction: 'desc',
        });
        setIssues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load issues');
      } finally {
        if (!isSilent) {
          setIsLoading(false);
        }
      }
    },
    [owner, repo, filter]
  );

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleOpenCreate = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
    setCreateTitle('');
    setCreateBody('');
    setCreateError(null);
  };

  const addIssueOptimistically = useCallback(
    (issue: GitHubIssue) => {
      // 取得値が欠けていてもUIが壊れないようにデフォルトを付与
      const normalized: GitHubIssue = {
        ...issue,
        body: issue.body ?? '',
        labels: issue.labels ?? [],
        assignees: issue.assignees ?? [],
        comments: issue.comments ?? 0,
      };

      // 現在のフィルターに合わない場合は即時表示しない
      if (!(filter === 'all' || normalized.state === filter)) {
        return;
      }

      const getTime = (item: GitHubIssue) =>
        new Date(item.updated_at ?? item.created_at).getTime();

      setIssues((prev) => {
        // IDか番号で重複を避ける
        const withoutDup = prev.filter(
          (i) => i.id !== normalized.id && i.number !== normalized.number
        );
        return [normalized, ...withoutDup].sort(
          (a, b) => getTime(b) - getTime(a)
        );
      });
    },
    [filter]
  );

  const handleCreate = async () => {
    const title = createTitle.trim();
    const body = createBody.trim();

    if (!title) {
      setCreateError('タイトルを入力してください。');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await createIssue(owner, repo, {
        title,
        ...(body ? { body } : {}),
      });

      // 楽観的にリストへ即時追加
      addIssueOptimistically(created);

      // モーダルは即閉じて入力をリセット
      setIsCreateOpen(false);
      setCreateTitle('');
      setCreateBody('');

      // バックグラウンドで最新一覧を取得（UIブロックしない）
      loadIssues({ silent: true }).catch((err) => {
        console.error('Failed to refresh issues after create', err);
      });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Issueの作成に失敗しました。');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">Issues</h3>
          
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1">
            <button
              onClick={() => setFilter('open')}
              className={`
                px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
                ${filter === 'open'
                  ? 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              Open {filter !== 'all' && filter === 'open' && `(${issues.length})`}
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`
                px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
                ${filter === 'closed'
                  ? 'bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              Closed {filter !== 'all' && filter === 'closed' && `(${issues.length})`}
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`
                px-3 py-1.5 rounded-md text-body-sm font-medium transition-all
                ${filter === 'all'
                  ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              All
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadIssues()}
            disabled={isLoading}
            className={`
              p-2 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              transition-colors
              disabled:opacity-50
              ${focusRing.default}
            `}
            title="更新"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            className={`
              flex items-center gap-2 px-3 py-1.5
              bg-[var(--accent-green)] text-white
              rounded-lg text-body-sm font-medium
              hover:bg-[var(--accent-green-emphasis)]
              transition-colors
              ${focusRing.default}
            `}
            onClick={handleOpenCreate}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Issue
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)] mx-auto mb-3" />
              <p className="text-body-sm text-[var(--text-muted)]">Loading issues...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center max-w-md">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-[var(--accent-red)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-body-sm text-[var(--accent-red-emphasis)] mb-4">{error}</p>
              <button
                onClick={() => loadIssues()}
                className={`
                  px-4 py-2 rounded-lg
                  bg-[var(--accent-blue)] text-white
                  hover:bg-[var(--accent-blue-emphasis)]
                  transition-colors
                  ${focusRing.default}
                `}
              >
                Retry
              </button>
            </div>
          </div>
        ) : issues.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-30 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-body-sm text-[var(--text-muted)] mb-2">
                {filter === 'open' ? 'No open issues' : filter === 'closed' ? 'No closed issues' : 'No issues'}
              </p>
              <p className="text-caption text-[var(--text-tertiary)]">
                Create a new issue to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                onClick={() => onIssueSelect?.(issue)}
              />
            ))}
          </div>
        )}
      </div>

      <GlassModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        title="New Issueを作成"
        className="max-w-2xl"
        tone="light"
      >
        <div className="space-y-4">
          {createError && (
            <div className="rounded-lg border border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] px-3 py-2 text-[var(--accent-red-emphasis)] text-body-sm">
              {createError}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-body-sm font-medium text-[var(--text-secondary)]">
              タイトル <span className="text-[var(--accent-red-emphasis)]">*</span>
            </label>
            <input
              type="text"
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className={`
                w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)]
                px-3 py-2 text-body-sm text-[var(--text-primary)]
                focus:border-[var(--accent-green)] focus:ring-2 focus:ring-[var(--accent-green-muted)]
              `}
              placeholder="Issue title"
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <label className="text-body-sm font-medium text-[var(--text-secondary)]">
              説明（任意）
            </label>
            <textarea
              value={createBody}
              onChange={(e) => setCreateBody(e.target.value)}
              className={`
                w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)]
                px-3 py-2 text-body-sm text-[var(--text-primary)]
                focus:border-[var(--accent-green)] focus:ring-2 focus:ring-[var(--accent-green-muted)]
                min-h-[140px]
              `}
              placeholder="Describe the issue..."
              disabled={isCreating}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseCreate}
              disabled={isCreating}
              className={`
                px-4 py-2 rounded-lg text-body-sm font-medium
                text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]
                transition-colors
                disabled:opacity-50
                ${focusRing.default}
              `}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={isCreating}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-semibold
                bg-[var(--accent-green)] text-white
                hover:bg-[var(--accent-green-emphasis)]
                transition-colors
                disabled:opacity-60
                ${focusRing.default}
              `}
            >
              {isCreating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                  作成中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  作成する
                </>
              )}
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
};

interface IssueRowProps {
  issue: GitHubIssue;
  onClick?: () => void;
}

const IssueRow: React.FC<IssueRowProps> = ({ issue, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3
        hover:bg-[var(--bg-hover)]
        transition-colors
        ${focusRing.default}
      `}
    >
      <div className="flex items-start gap-3">
        {/* State Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {issue.state === 'open' ? (
            <svg className="w-5 h-5 text-[var(--accent-green)]" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-[var(--accent-purple)]" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.28 6.78a.75.75 0 00-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 00-1.06 1.06l2 2a.75.75 0 001.06 0l3.5-3.5z" />
              <path fillRule="evenodd" d="M16 8A8 8 0 110 8a8 8 0 0116 0zm-1.5 0a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-body-sm font-medium text-[var(--text-primary)] truncate">
              {issue.title}
            </span>
          </div>

          <div className="flex items-center gap-3 text-caption text-[var(--text-muted)]">
            <span>#{issue.number}</span>
            <span>opened {timeAgo(issue.created_at)}</span>
            {issue.comments > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {issue.comments}
              </span>
            )}
          </div>

          {/* Labels */}
          {issue.labels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {issue.labels.slice(0, 4).map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 rounded-full text-caption font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 4 && (
                <span className="text-caption text-[var(--text-muted)]">
                  +{issue.labels.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Assignees */}
        {issue.assignees.length > 0 && (
          <div className="flex-shrink-0 flex -space-x-2">
            {issue.assignees.slice(0, 3).map((assignee) => (
              <img
                key={assignee.login}
                src={assignee.avatar_url}
                alt={assignee.login}
                className="w-6 h-6 rounded-full border-2 border-[var(--bg-primary)]"
                title={assignee.login}
              />
            ))}
            {issue.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-caption text-[var(--text-muted)]">
                +{issue.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  );
};

export default IssuesTab;
