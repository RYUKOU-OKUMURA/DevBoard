import React from 'react';

export type TabType = 'board' | 'updates';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  updateCount?: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  updateCount = 0,
}) => {
  return (
    <nav className="flex gap-2 px-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => onTabChange('board')}
        className={`
          flex items-center gap-2 px-6 py-4 border-b-2 transition-all
          ${
            activeTab === 'board'
              ? 'border-green-500 text-green-600 dark:text-green-400 font-medium'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
        <span>カンバン</span>
      </button>

      <button
        onClick={() => onTabChange('updates')}
        className={`
          flex items-center gap-2 px-6 py-4 border-b-2 transition-all relative
          ${
            activeTab === 'updates'
              ? 'border-green-500 text-green-600 dark:text-green-400 font-medium'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>最近の更新</span>
        {updateCount > 0 && (
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full">
            {updateCount}
          </span>
        )}
      </button>
    </nav>
  );
};
