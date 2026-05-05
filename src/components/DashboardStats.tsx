import React from 'react';
import type { RecentItem } from '../types';

type ActivityType = 'issues' | 'pulls';

interface DashboardStatsProps {
  activityType: ActivityType;
  onActivityTypeChange: (type: ActivityType) => void;
  recentItems: RecentItem[];
  isLoadingActivities?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  activityType,
  onActivityTypeChange,
  recentItems,
  isLoadingActivities = false,
}) => {
  return (
    <div className="px-inset-lg py-inset-sm bg-surface-app border-b border-[var(--border-subtle)] transition-colors">
      <div className="max-w-5xl mx-auto bg-surface-primary rounded-lg border border-[var(--border-subtle)] shadow-sm p-inset-md">
        <div className="flex items-center justify-between mb-inset-sm">
          <h3 className="text-body-sm font-semibold text-[var(--text-secondary)]">最新の項目 (7日間)</h3>
          <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Activity type toggle">
            <button
              type="button"
              onClick={() => onActivityTypeChange('issues')}
              className={`px-inline-md py-stack-xs text-caption font-medium border border-[var(--border-subtle)] ${activityType === 'issues' ? 'bg-[var(--accent-blue)] text-text-inverse' : 'bg-surface-secondary text-[var(--text-secondary)] hover:bg-surface-hover'} rounded-l-md transition-colors`}
              aria-pressed={activityType === 'issues'}
            >
              Issue
            </button>
            <button
              type="button"
              onClick={() => onActivityTypeChange('pulls')}
              className={`px-inline-md py-stack-xs text-caption font-medium border-t border-b border-r border-[var(--border-subtle)] ${activityType === 'pulls' ? 'bg-[var(--accent-blue)] text-text-inverse' : 'bg-surface-secondary text-[var(--text-secondary)] hover:bg-surface-hover'} rounded-r-md transition-colors`}
              aria-pressed={activityType === 'pulls'}
            >
              PullRequest
            </button>
          </div>
        </div>
        {isLoadingActivities ? (
          <p className="text-body-sm text-[var(--text-muted)] text-center py-stack-sm">データを取得中...</p>
        ) : recentItems.length === 0 ? (
          <p className="text-body-sm text-[var(--text-muted)] text-center py-stack-sm">直近7日間の{activityType === 'issues' ? 'Issue' : 'PullRequest'}はありません</p>
        ) : (
          <div className="space-y-stack-xs">
            {recentItems.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-inset-xs hover:bg-surface-hover rounded transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-[var(--text-primary)] truncate">
                    {item.title}
                    <span className="ml-inline-sm text-[var(--text-muted)]">#{item.number}</span>
                  </p>
                  <p className="text-caption text-[var(--text-muted)] truncate">{item.repo.nameWithOwner} ・ {item.relativeTime}</p>
                </div>
                <span className={`ml-inline-sm text-caption font-semibold ${item.type === 'Issue' ? 'text-[var(--accent-green-emphasis)]' : 'text-[var(--accent-purple-emphasis)]'}`}>
                  {item.type === 'Issue' ? 'Issue' : 'PR'}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
