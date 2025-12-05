import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { focusRing } from '../lib/focusRing';
import type { RecentItem } from '../types';

type ActivityTypeFilter = 'all' | 'issues' | 'pulls';
type ActivityStatusFilter = 'all' | 'open' | 'closed' | 'merged';

export interface ActivityPanelFilters {
  repo: string;
  type: ActivityTypeFilter;
  status: ActivityStatusFilter;
}

interface ActivityPanelProps {
  issues: RecentItem[];
  pullRequests: RecentItem[];
  isLoadingIssues?: boolean;
  isLoadingPullRequests?: boolean;
  isLoadingMoreIssues?: boolean;
  isLoadingMorePullRequests?: boolean;
  issuesError?: string | null;
  pullRequestsError?: string | null;
  hasMoreIssues?: boolean;
  hasMorePullRequests?: boolean;
  onLoadMoreIssues?: () => void | Promise<void>;
  onLoadMorePullRequests?: () => void | Promise<void>;
  initialFilters?: Partial<ActivityPanelFilters>;
  onFiltersChange?: (filters: ActivityPanelFilters) => void;
  className?: string;
}

const statusColors = {
  open: {
    badge:
      'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border-[var(--accent-green-border)]',
    dot: 'var(--accent-green)',
  },
  closed: {
    badge:
      'bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] border-[var(--accent-purple-border)]',
    dot: 'var(--accent-purple)',
  },
  merged: {
    badge:
      'bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] border-[var(--accent-purple-border)]',
    dot: 'var(--accent-purple)',
  },
};

const ActivityCard: React.FC<{ item: RecentItem }> = ({ item }) => {
  const isIssue = item.type === 'Issue';
  const state = (item.state ?? 'OPEN').toUpperCase();
  const isOpen = state === 'OPEN';
  const isClosed = state === 'CLOSED';
  const isMerged = state === 'MERGED';

  const statusStyle = isOpen
    ? statusColors.open
    : isMerged
      ? statusColors.merged
      : statusColors.closed;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        block
        bg-surface-primary
        border border-[var(--border-subtle)]
        rounded-xl
        p-inset-md
        hover:border-[var(--accent-green-border)]
        hover:shadow-md
        transition-all duration-200
        ${focusRing.default}
      `}
    >
      <div className="flex items-start gap-inline-md">
        <div className="flex-shrink-0 mt-0.5">
          {isIssue ? (
            <svg
              className={`w-5 h-5 ${isOpen ? 'text-[var(--accent-green)]' : 'text-[var(--accent-purple)]'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              {isOpen ? (
                <>
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </>
              ) : (
                <polyline points="9 11 12 14 16 10" />
              )}
            </svg>
          ) : (
            <svg
              className={`w-5 h-5 ${isOpen ? 'text-[var(--accent-green)]' : 'text-[var(--accent-purple)]'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <line x1="6" y1="9" x2="6" y2="21" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-stack-2xs">
          <div className="flex items-start gap-inline-xs">
            <span
              className={`
                inline-flex items-center gap-inline-2xs px-inline-sm py-stack-2xs
                text-caption font-semibold uppercase tracking-wide
                border rounded-lg
                ${statusStyle.badge}
              `}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusStyle.dot }}
                aria-hidden
              />
              {isOpen ? 'Open' : isMerged ? 'Merged' : 'Closed'}
            </span>
            <span className="text-caption text-[var(--text-tertiary)] truncate">
              {item.repo.nameWithOwner}
            </span>
          </div>

          <div className="flex items-start gap-inline-md">
            <h3 className="flex-1 text-body-md font-semibold text-[var(--text-primary)] line-clamp-2">
              {item.title}
            </h3>
            <span className="text-caption font-medium text-[var(--text-secondary)]">
              #{item.number}
            </span>
          </div>

          <div className="flex items-center gap-inline-sm text-caption text-[var(--text-muted)] flex-wrap">
            <span>{item.relativeTime}</span>
            <span aria-hidden>•</span>
            <span className="truncate">{isIssue ? 'Issue' : 'Pull Request'}</span>
          </div>
        </div>
      </div>
    </a>
  );
};

interface SectionProps {
  title: string;
  regionLabel: string;
  items: RecentItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  error?: string | null;
  emptyMessage: string;
  hasMore?: boolean;
  onLoadMore?: () => void | Promise<void>;
}

const ActivitySection: React.FC<SectionProps> = ({
  title,
  regionLabel,
  items,
  isLoading = false,
  isLoadingMore = false,
  error,
  emptyMessage,
  hasMore = false,
  onLoadMore,
}) => {
  return (
    <section
      role="region"
      aria-label={regionLabel}
      className="bg-surface-primary border border-[var(--border-subtle)] rounded-xl p-inset-md shadow-sm"
    >
      <header className="flex items-center justify-between mb-stack-sm">
        <div className="flex items-center gap-inline-xs">
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">{title}</h3>
          <span className="px-inline-sm py-stack-2xs text-caption font-semibold rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {items.length}
          </span>
        </div>
        <span className="text-caption text-[var(--text-tertiary)]" aria-live="polite">
          {isLoading ? '読み込み中' : error ? 'エラー' : items.length === 0 ? 'アイテムなし' : `${items.length}件表示`}
        </span>
      </header>

      <div className="max-h-[460px] overflow-auto space-y-stack-sm">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-green-muted)] border-b-[var(--accent-green)] animate-spin" aria-hidden />
              <span className="text-body-sm">データを取得中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <svg
              className="w-10 h-10 text-[var(--accent-red)] mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
            </svg>
            <p className="text-body-sm text-[var(--accent-red-emphasis)] font-medium">{error}</p>
            {onLoadMore && (
              <button
                type="button"
                onClick={onLoadMore}
                className={`
                  mt-3 inline-flex items-center gap-2 px-3 py-2
                  rounded-lg border border-[var(--border-subtle)]
                  bg-[var(--bg-secondary)]
                  text-[var(--text-primary)]
                  hover:bg-[var(--bg-hover)]
                  transition-colors
                  ${focusRing.default}
                `}
              >
                再試行
              </button>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)]">
            <svg
              className="w-12 h-12 text-[var(--text-muted)] mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293L6.586 13H4"
              />
            </svg>
            <p className="text-body-sm text-[var(--text-muted)]">{emptyMessage}</p>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <ActivityCard key={`${item.type}-${item.repo.nameWithOwner}-${item.number}-${item.occurredAt}`} item={item} />
            ))}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2
                    rounded-lg border border-[var(--border-subtle)]
                    bg-[var(--bg-secondary)]
                    text-[var(--text-primary)]
                    hover:bg-[var(--bg-hover)]
                    transition-colors
                    disabled:opacity-60
                    ${focusRing.default}
                  `}
                  aria-live="polite"
                >
                  {isLoadingMore ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-[var(--accent-green-muted)] border-b-[var(--accent-green)] animate-spin" aria-hidden />
                      読み込み中...
                    </>
                  ) : (
                    'もっと見る'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export const ActivityPanel: React.FC<ActivityPanelProps> = ({
  issues,
  pullRequests,
  isLoadingIssues = false,
  isLoadingPullRequests = false,
  isLoadingMoreIssues = false,
  isLoadingMorePullRequests = false,
  issuesError = null,
  pullRequestsError = null,
  hasMoreIssues = false,
  hasMorePullRequests = false,
  onLoadMoreIssues,
  onLoadMorePullRequests,
  initialFilters,
  onFiltersChange,
  className = '',
}) => {
  const [repoFilter, setRepoFilter] = useState<string>(initialFilters?.repo ?? 'all');
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>(initialFilters?.type ?? 'all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatusFilter>(initialFilters?.status ?? 'all');

  const repoOptions = useMemo(() => {
    const set = new Set<string>();
    [...issues, ...pullRequests].forEach((item) => set.add(item.repo.nameWithOwner));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [issues, pullRequests]);

  useEffect(() => {
    onFiltersChange?.({
      repo: repoFilter,
      type: typeFilter,
      status: statusFilter,
    });
  }, [repoFilter, typeFilter, statusFilter, onFiltersChange]);

  const matchesRepo = useCallback(
    (item: RecentItem) => repoFilter === 'all' || item.repo.nameWithOwner === repoFilter,
    [repoFilter]
  );

  const matchesStatus = useCallback(
    (item: RecentItem) => {
      if (statusFilter === 'all') return true;
      const state = (item.state ?? 'OPEN').toUpperCase();
      if (statusFilter === 'merged') {
        return item.type === 'PullRequest' && state === 'MERGED';
      }
      if (statusFilter === 'open') return state === 'OPEN';
      return state === 'CLOSED';
    },
    [statusFilter]
  );

  const filteredIssues = useMemo(
    () => issues.filter((item) => matchesRepo(item) && matchesStatus(item)),
    [issues, matchesRepo, matchesStatus]
  );

  const filteredPullRequests = useMemo(
    () => pullRequests.filter((item) => matchesRepo(item) && matchesStatus(item)),
    [pullRequests, matchesRepo, matchesStatus]
  );

  const showIssues = typeFilter !== 'pulls';
  const showPulls = typeFilter !== 'issues';

  return (
    <div
      className={`
        flex flex-col gap-4
        ${className}
      `.trim()}
    >
      <div
        className="
          flex flex-wrap items-center gap-3
          bg-surface-primary
          border border-[var(--border-subtle)]
          rounded-xl
          p-inset-md
          shadow-sm
        "
        role="group"
        aria-label="アクティビティフィルター"
      >
        <div className="flex items-center gap-2">
          <label className="text-caption text-[var(--text-secondary)]" htmlFor="repo-filter">
            リポジトリ
          </label>
          <select
            id="repo-filter"
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            className={`
              min-w-[200px]
              rounded-lg border border-[var(--border-subtle)]
              bg-[var(--bg-secondary)]
              text-body-sm text-[var(--text-primary)]
              px-3 py-2
              focus:outline-none
              ${focusRing.default}
            `}
          >
            <option value="all">すべてのリポジトリ</option>
            {repoOptions.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-caption text-[var(--text-secondary)]">種別</span>
          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-1">
            {(['all', 'issues', 'pulls'] as ActivityTypeFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTypeFilter(value)}
                className={`
                  px-3 py-1.5 text-body-sm font-medium rounded-md
                  transition-colors
                  ${typeFilter === value
                    ? 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
                  ${focusRing.default}
                `}
                aria-pressed={typeFilter === value}
              >
                {value === 'all' ? 'すべて' : value === 'issues' ? 'Issues' : 'PRs'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-caption text-[var(--text-secondary)]">ステータス</span>
          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-1">
            {(['all', 'open', 'closed', 'merged'] as ActivityStatusFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`
                  px-3 py-1.5 text-body-sm font-medium rounded-md
                  transition-colors
                  ${statusFilter === value
                    ? 'bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
                  ${focusRing.default}
                `}
                aria-pressed={statusFilter === value}
              >
                {value === 'all'
                  ? 'すべて'
                  : value === 'open'
                    ? 'Open'
                    : value === 'closed'
                      ? 'Closed'
                      : 'Merged'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {showIssues && (
          <ActivitySection
            title="Issues"
            regionLabel="Issueセクション"
            items={filteredIssues}
            isLoading={isLoadingIssues}
            isLoadingMore={isLoadingMoreIssues}
            error={issuesError ?? undefined}
            emptyMessage="直近のIssueはありません"
            hasMore={hasMoreIssues}
            onLoadMore={onLoadMoreIssues}
          />
        )}

        {showPulls && (
          <ActivitySection
            title="Pull Requests"
            regionLabel="Pull Requestセクション"
            items={filteredPullRequests}
            isLoading={isLoadingPullRequests}
            isLoadingMore={isLoadingMorePullRequests}
            error={pullRequestsError ?? undefined}
            emptyMessage="直近のPull Requestはありません"
            hasMore={hasMorePullRequests}
            onLoadMore={onLoadMorePullRequests}
          />
        )}
      </div>
    </div>
  );
};

export default ActivityPanel;
