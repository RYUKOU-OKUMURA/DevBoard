import React, { useState, useEffect } from 'react';
import { focusRing } from '../lib/focusRing';

export type TabType = 'board' | 'updates' | 'manual';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  updateCount?: number;
  manualRepoCount?: number;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  updateCount = 0,
  manualRepoCount = 0,
}) => {
  const [prevTab, setPrevTab] = useState<TabType>(activeTab);

  useEffect(() => {
    if (prevTab !== activeTab) {
      setPrevTab(activeTab);
    }
  }, [activeTab, prevTab]);

  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  return (
    <nav
      className="flex gap-inline-md px-inset-xl bg-surface-primary border-b border-[var(--border-subtle)] transition-colors"
      role="tablist"
      aria-label="ビュー切り替え"
    >
      <button
        onClick={() => handleTabChange('board')}
        className={`
          flex items-center gap-inline-md px-inset-lg py-inset-md border-b-2 transition-all duration-250 motion-safe:ease-smooth motion-reduce:transition-none text-body-sm
          ${
            activeTab === 'board'
              ? 'border-[var(--accent-green)] text-[var(--accent-green)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-surface-hover'
          }
          ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75
        `}
        role="tab"
        aria-selected={activeTab === 'board'}
        tabIndex={activeTab === 'board' ? 0 : -1}
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
        onClick={() => handleTabChange('updates')}
        className={`
          flex items-center gap-inline-md px-inset-lg py-inset-md border-b-2 transition-all duration-250 motion-safe:ease-smooth motion-reduce:transition-none relative text-body-sm
          ${
            activeTab === 'updates'
              ? 'border-[var(--accent-green)] text-[var(--accent-green)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-surface-hover'
          }
          ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75
        `}
        role="tab"
        aria-selected={activeTab === 'updates'}
        tabIndex={activeTab === 'updates' ? 0 : -1}
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
          <span className="inline-flex items-center justify-center px-inline-sm py-inline-xs text-xs font-semibold text-text-inverse bg-accent-green rounded-lg shadow-sm">
            {updateCount}
          </span>
        )}
      </button>

      <button
        onClick={() => handleTabChange('manual')}
        className={`
          flex items-center gap-inline-md px-inset-lg py-inset-md border-b-2 transition-all duration-250 motion-safe:ease-smooth motion-reduce:transition-none relative text-body-sm
          ${
            activeTab === 'manual'
              ? 'border-[var(--accent-green)] text-[var(--accent-green)] font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-surface-hover'
          }
          ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75
        `}
        role="tab"
        aria-selected={activeTab === 'manual'}
        tabIndex={activeTab === 'manual' ? 0 : -1}
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
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>追加したリポジトリ</span>
        {manualRepoCount > 0 && (
          <span className="inline-flex items-center justify-center px-inline-sm py-inline-xs text-xs font-semibold text-text-inverse bg-accent-green rounded-lg shadow-sm">
            {manualRepoCount}
          </span>
        )}
      </button>
    </nav>
  );
};
