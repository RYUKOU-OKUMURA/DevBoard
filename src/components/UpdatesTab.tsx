import React from 'react';
import type { RecentItem } from '../types';

interface UpdatesTabProps {
  recentItems: RecentItem[];
  isLoadingActivities?: boolean;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  recentItems,
  isLoadingActivities = false,
}) => {
  // ステータスアイコンとバッジを返す関数
  const getStatusDisplay = (item: RecentItem) => {
    // 実際のstateを使用（なければOPENとして扱う）
    const state = item.state || 'OPEN';

    if (item.type === 'Issue') {
      const isOpen = state === 'OPEN';
      return {
        icon: isOpen ? (
          <svg
            className="update-icon flex-shrink-0 text-[var(--accent-green)]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg
            className="update-icon flex-shrink-0 text-[var(--accent-purple)]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 11 12 14 16 10" />
          </svg>
        ),
        badge: isOpen ? (
          <span className="px-inline-md py-stack-xs text-caption font-semibold uppercase tracking-wide bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)] rounded-lg">
            未対応
          </span>
        ) : (
          <span className="px-inline-md py-stack-xs text-caption font-semibold uppercase tracking-wide bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] border border-[var(--accent-purple-border)] rounded-lg">
            対応済み
          </span>
        ),
      };
    } else {
      // Pull Request
      const isMerged = state === 'MERGED';
      const isClosed = state === 'CLOSED';
      const isOpen = state === 'OPEN';

      return {
        icon: isOpen ? (
          <svg
            className="update-icon flex-shrink-0 text-[var(--accent-green)]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
          </svg>
        ) : (
          <svg
            className="update-icon flex-shrink-0 text-[var(--accent-purple)]"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="18" r="3" />
            <circle cx="6" cy="6" r="3" />
            <path d="M13 6h3a2 2 0 0 1 2 2v7" />
            <line x1="6" y1="9" x2="6" y2="21" />
          </svg>
        ),
        badge: isOpen ? (
          <span className="px-inline-md py-stack-xs text-caption font-semibold uppercase tracking-wide bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)] rounded-lg">
            未対応
          </span>
        ) : isMerged ? (
          <span className="px-inline-md py-stack-xs text-caption font-semibold uppercase tracking-wide bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] border border-[var(--accent-purple-border)] rounded-lg">
            マージ済み
          </span>
        ) : (
          <span className="px-inline-md py-stack-xs text-caption font-semibold uppercase tracking-wide bg-[var(--accent-red-muted)] text-[var(--accent-red-emphasis)] border border-[var(--accent-red-border)] rounded-lg">
            {isClosed ? 'クローズ' : '却下'}
          </span>
        ),
      };
    }
  };

  // アイテムをタイプで分割
  const issues = recentItems.filter(item => item.type === 'Issue');
  const pullRequests = recentItems.filter(item => item.type === 'PullRequest');

  const renderItemList = (items: RecentItem[], title: string, isLoading: boolean, emptyMessage: string) => {
    return (
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-title-3 font-bold text-[var(--text-primary)]">{title}</h2>
          <span className="px-2 py-0.5 text-caption font-semibold rounded-full bg-surface-tertiary text-[var(--text-secondary)]">
            {items.length}
          </span>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-green)] mx-auto mb-4"></div>
              <p className="text-[var(--text-muted)]">データを取得中...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-surface-secondary rounded-xl border border-dashed border-[var(--border-subtle)]">
            <svg
              className="w-12 h-12 text-[var(--text-muted)] mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-[var(--text-muted)] font-medium text-body-sm">{emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-stack-sm">
            {items.map((item, index) => {
              const { icon, badge } = getStatusDisplay(item);
              return (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-surface-primary border border-[var(--border-subtle)] rounded-lg p-4 hover:shadow-lg hover:border-[var(--accent-green)] transition-all group"
                >
                  <div className="flex items-start gap-inline-md mb-2">
                    {icon}
                    <h3 className="flex-1 text-body-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-green)] transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    {badge}
                  </div>

                  <div className="flex items-center gap-inline-md text-caption text-[var(--text-muted)] ml-7 flex-wrap">
                    <span className="font-medium truncate">{item.repo.nameWithOwner}</span>
                    <span>#{item.number}</span>
                    <span>{item.relativeTime}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-app transition-colors">
      {/* Header with title */}
      <div className="px-8 py-6 bg-surface-primary border-b border-[var(--border-subtle)] transition-colors">
        <h1 className="text-title-1 font-bold text-[var(--text-primary)]">最近のアクティビティ</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6 overflow-auto transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {renderItemList(issues, 'Issues', isLoadingActivities, '直近7日間のIssueはありません')}
          {renderItemList(pullRequests, 'Pull Requests', isLoadingActivities, '直近7日間のPull Requestはありません')}
        </div>
      </div>
    </div>
  );
};
