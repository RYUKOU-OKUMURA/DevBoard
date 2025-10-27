import React from 'react';
import type { RecentItem } from '../api/repos';

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
    <div className="px-6 py-3 bg-surface-app border-b border-[color:var(--border-subtle)] transition-colors">
      <div className="max-w-5xl mx-auto bg-surface-primary rounded-lg border border-[color:var(--border-subtle)] shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[color:var(--text-secondary)]">最新の項目 (7日間)</h3>
          <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Activity type toggle">
            <button
              type="button"
              onClick={() => onActivityTypeChange('issues')}
              className={`px-3 py-1 text-xs font-medium border border-[color:var(--border-subtle)] ${activityType === 'issues' ? 'bg-[color:var(--accent-blue)] text-text-inverse' : 'bg-surface-secondary text-[color:var(--text-secondary)] hover:bg-surface-hover'} rounded-l-md transition-colors`}
              aria-pressed={activityType === 'issues'}
            >
              Issue
            </button>
            <button
              type="button"
              onClick={() => onActivityTypeChange('pulls')}
              className={`px-3 py-1 text-xs font-medium border-t border-b border-r border-[color:var(--border-subtle)] ${activityType === 'pulls' ? 'bg-[color:var(--accent-blue)] text-text-inverse' : 'bg-surface-secondary text-[color:var(--text-secondary)] hover:bg-surface-hover'} rounded-r-md transition-colors`}
              aria-pressed={activityType === 'pulls'}
            >
              PullRequest
            </button>
          </div>
        </div>
        {isLoadingActivities ? (
          <p className="text-sm text-[color:var(--text-muted)] text-center py-4">データを取得中...</p>
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)] text-center py-4">直近7日間の{activityType === 'issues' ? 'Issue' : 'PullRequest'}はありません</p>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 hover:bg-surface-hover rounded transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">
                    {item.title}
                    <span className="ml-2 text-[color:var(--text-muted)]">#{item.number}</span>
                  </p>
                  <p className="text-xs text-[color:var(--text-muted)] truncate">{item.repo.nameWithOwner} ・ {item.relativeTime}</p>
                </div>
                <span className={`ml-2 text-xs font-semibold ${item.type === 'Issue' ? 'text-[color:var(--accent-green-emphasis)]' : 'text-[color:var(--accent-purple-emphasis)]'}`}>
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
