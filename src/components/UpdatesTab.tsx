import React from 'react';
import type { RecentItem } from '../types';

type ActivityType = 'issues' | 'pulls';

interface UpdatesTabProps {
  activityType: ActivityType;
  onActivityTypeChange: (type: ActivityType) => void;
  recentItems: RecentItem[];
  isLoadingActivities?: boolean;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({
  activityType,
  onActivityTypeChange,
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
            className="update-icon flex-shrink-0 text-[color:var(--accent-green)]"
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
            className="update-icon flex-shrink-0 text-[color:var(--accent-purple)]"
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
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green-emphasis)] border border-[color:var(--accent-green-border)] rounded-lg">
            未対応
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple-emphasis)] border border-[color:var(--accent-purple-border)] rounded-lg">
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
            className="update-icon flex-shrink-0 text-[color:var(--accent-green)]"
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
            className="update-icon flex-shrink-0 text-[color:var(--accent-purple)]"
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
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-[color:var(--accent-green-muted)] text-[color:var(--accent-green-emphasis)] border border-[color:var(--accent-green-border)] rounded-lg">
            未対応
          </span>
        ) : isMerged ? (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-[color:var(--accent-purple-muted)] text-[color:var(--accent-purple-emphasis)] border border-[color:var(--accent-purple-border)] rounded-lg">
            マージ済み
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-[color:var(--accent-red-muted)] text-[color:var(--accent-red-emphasis)] border border-[color:var(--accent-red-border)] rounded-lg">
            却下
          </span>
        ),
      };
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface-app transition-colors">
      {/* Sub-tab Navigation */}
      <div className="flex gap-4 px-8 py-6 bg-surface-primary border-b border-[color:var(--border-subtle)] transition-colors">
        <button
          onClick={() => onActivityTypeChange('issues')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-medium
            ${
              activityType === 'issues'
                ? 'bg-accent-green text-text-inverse border-[color:var(--accent-green)] shadow-sm'
                : 'bg-surface-secondary text-[color:var(--text-muted)] border-[color:var(--border-subtle)] hover:bg-surface-hover'
            }
          `}
        >
          <span>Issues</span>
          <span
            className={`
              px-2 py-0.5 text-xs font-semibold rounded-full
              ${
                activityType === 'issues'
                  ? 'bg-[color:rgba(255,255,255,0.22)] text-text-inverse'
                  : 'bg-surface-tertiary text-[color:var(--text-secondary)]'
              }
            `}
          >
            {activityType === 'issues' ? recentItems.length : 0}
          </span>
        </button>

        <button
          onClick={() => onActivityTypeChange('pulls')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-medium
            ${
              activityType === 'pulls'
                ? 'bg-accent-green text-text-inverse border-[color:var(--accent-green)] shadow-sm'
                : 'bg-surface-secondary text-[color:var(--text-muted)] border-[color:var(--border-subtle)] hover:bg-surface-hover'
            }
          `}
        >
          <span>Pull Requests</span>
          <span
            className={`
              px-2 py-0.5 text-xs font-semibold rounded-full
              ${
                activityType === 'pulls'
                  ? 'bg-[color:rgba(255,255,255,0.22)] text-text-inverse'
                  : 'bg-surface-tertiary text-[color:var(--text-secondary)]'
              }
            `}
          >
            {activityType === 'pulls' ? recentItems.length : 0}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6 transition-colors">
        <div className="max-w-5xl mx-auto">
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[color:var(--accent-green)] mx-auto mb-4"></div>
                <p className="text-[color:var(--text-muted)]">データを取得中...</p>
              </div>
            </div>
          ) : recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-surface-primary rounded-2xl border-2 border-dashed border-[color:var(--border-subtle)]">
              <svg
                className="w-16 h-16 text-[color:var(--text-muted)] mb-4"
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
              <p className="text-[color:var(--text-muted)] font-medium">
                直近7日間の{activityType === 'issues' ? 'Issue' : 'Pull Request'}はありません
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentItems.map((item, index) => {
                const { icon, badge } = getStatusDisplay(item);
                return (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-surface-primary border border-[color:var(--border-subtle)] rounded-xl p-6 hover:shadow-lg hover:border-[color:var(--accent-green)] transition-all group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {icon}
                      <h3 className="flex-1 text-base font-semibold text-[color:var(--text-primary)] group-hover:text-[color:var(--accent-green)] transition-colors">
                        {item.title}
                      </h3>
                      {badge}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-[color:var(--text-muted)] ml-9">
                      <span className="font-medium">{item.repo.nameWithOwner}</span>
                      <span>#{item.number}</span>
                      <span>{item.relativeTime}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
