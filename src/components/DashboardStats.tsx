import React from 'react';
import { ColumnKey } from '../types';

interface RecentActivity {
  repo: {
    nameWithOwner: string;
    htmlUrl: string;
  };
  lastActivity: string;
}

interface DashboardStatsProps {
  totalRepos: number;
  categoryCounts: Record<ColumnKey, number>;
  recentActivities: RecentActivity[];
  isLoadingActivities?: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalRepos,
  categoryCounts,
  recentActivities,
  isLoadingActivities = false,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
      {/* Stats Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">リポジトリ統計</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">総数</span>
            <span className="text-lg font-bold text-gray-900">{totalRepos}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">アクティブ</span>
              <span className="text-sm font-semibold text-green-700">{categoryCounts.Active}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">停滞</span>
              <span className="text-sm font-semibold text-yellow-700">{categoryCounts.Stale}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">休眠</span>
              <span className="text-sm font-semibold text-orange-700">{categoryCounts.Dormant}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">アーカイブ</span>
              <span className="text-sm font-semibold text-gray-700">{categoryCounts.Archived}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">最近のアクティビティ (7日間)</h3>
        {isLoadingActivities ? (
          <p className="text-sm text-gray-500 text-center py-4">アクティビティデータを取得中...</p>
        ) : recentActivities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">直近7日間のアクティビティはありません</p>
        ) : (
          <div className="space-y-2">
            {recentActivities.map((activity, index) => (
              <a
                key={index}
                href={activity.repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-600 group-hover:text-blue-700 truncate">
                    {activity.repo.nameWithOwner}
                  </p>
                  <p className="text-xs text-gray-500">{activity.lastActivity}</p>
                </div>
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-blue-600 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
