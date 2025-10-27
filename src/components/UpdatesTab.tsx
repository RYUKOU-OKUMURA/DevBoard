import React from 'react';
import type { RecentItem } from '../api/repos';

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
    // TODO: API側で state を取得できるようになったら、それを使用する
    // 現時点では仮のロジック（ランダムに未対応/対応済みを表示）
    const isOpen = Math.random() > 0.5; // 仮の実装

    if (item.type === 'Issue') {
      return {
        icon: isOpen ? (
          <svg
            className="update-icon flex-shrink-0 text-green-600"
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
            className="update-icon flex-shrink-0 text-purple-600"
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
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-green-100 text-green-700 border border-green-200 rounded-lg">
            未対応
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200 rounded-lg">
            対応済み
          </span>
        ),
      };
    } else {
      // Pull Request
      const isMerged = Math.random() > 0.5; // 仮の実装
      return {
        icon: isOpen && !isMerged ? (
          <svg
            className="update-icon flex-shrink-0 text-green-600"
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
            className="update-icon flex-shrink-0 text-purple-600"
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
        badge: isOpen && !isMerged ? (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-green-100 text-green-700 border border-green-200 rounded-lg">
            未対応
          </span>
        ) : isMerged ? (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200 rounded-lg">
            マージ済み
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200 rounded-lg">
            却下
          </span>
        ),
      };
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Sub-tab Navigation */}
      <div className="flex gap-4 px-8 py-6 bg-white border-b border-gray-200">
        <button
          onClick={() => onActivityTypeChange('issues')}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl border transition-all font-medium
            ${
              activityType === 'issues'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <span>Issues</span>
          <span
            className={`
              px-2 py-0.5 text-xs font-semibold rounded-full
              ${
                activityType === 'issues'
                  ? 'bg-white bg-opacity-30 text-white'
                  : 'bg-gray-200 text-gray-700'
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
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }
          `}
        >
          <span>Pull Requests</span>
          <span
            className={`
              px-2 py-0.5 text-xs font-semibold rounded-full
              ${
                activityType === 'pulls'
                  ? 'bg-white bg-opacity-30 text-white'
                  : 'bg-gray-200 text-gray-700'
              }
            `}
          >
            {activityType === 'pulls' ? recentItems.length : 0}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          {isLoadingActivities ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">データを取得中...</p>
              </div>
            </div>
          ) : recentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
              <svg
                className="w-16 h-16 text-gray-400 mb-4"
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
              <p className="text-gray-600 font-medium">
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
                    className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-green-300 transition-all group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {icon}
                      <h3 className="flex-1 text-base font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                        {item.title}
                      </h3>
                      {badge}
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 ml-9">
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
