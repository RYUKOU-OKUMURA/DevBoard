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
    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
      <div className="max-w-5xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">最新の項目 (7日間)</h3>
          <div className="inline-flex rounded-md shadow-sm" role="group" aria-label="Activity type toggle">
            <button
              type="button"
              onClick={() => onActivityTypeChange('issues')}
              className={`px-3 py-1 text-xs font-medium border border-gray-300 ${activityType === 'issues' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} rounded-l-md`}
              aria-pressed={activityType === 'issues'}
            >
              Issue
            </button>
            <button
              type="button"
              onClick={() => onActivityTypeChange('pulls')}
              className={`px-3 py-1 text-xs font-medium border-t border-b border-r border-gray-300 ${activityType === 'pulls' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} rounded-r-md`}
              aria-pressed={activityType === 'pulls'}
            >
              PullRequest
            </button>
          </div>
        </div>
        {isLoadingActivities ? (
          <p className="text-sm text-gray-500 text-center py-4">データを取得中...</p>
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">直近7日間の{activityType === 'issues' ? 'Issue' : 'PullRequest'}はありません</p>
        ) : (
          <div className="space-y-2">
            {recentItems.map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                    <span className="ml-2 text-gray-500">#{item.number}</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">{item.repo.nameWithOwner} ・ {item.relativeTime}</p>
                </div>
                <span className={`ml-2 text-xs font-semibold ${item.type === 'Issue' ? 'text-emerald-700' : 'text-indigo-700'}`}>
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
