import { motion } from 'framer-motion';
import React from 'react';
import { focusRing } from '../lib/focusRing';

export type TabType = 'board' | 'updates' | 'manual';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  updateCount?: number;
  manualRepoCount?: number;
}

const ICONS: Record<TabType, JSX.Element> = {
  board: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  updates: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  manual: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

const BADGE_STYLE = {
  background: 'var(--brand-gradient)',
};

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  updateCount = 0,
  manualRepoCount = 0,
}) => {
  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  const tabs: Array<{ id: TabType; label: string; badge?: number }> = [
    { id: 'board', label: 'カンバン' },
    { id: 'updates', label: '最近の更新', badge: updateCount },
    { id: 'manual', label: '追加したリポジトリ', badge: manualRepoCount },
  ];

  return (
    <nav
      className="flex gap-inline-md px-inset-xl bg-surface-primary border-b border-[var(--border-subtle)] transition-colors"
      role="tablist"
      aria-label="ビュー切り替え"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`
              relative flex items-center gap-inline-md px-inset-lg py-inset-md border-b-2 rounded-sm text-body-sm
              ${isActive ? 'text-[var(--accent-green)] font-semibold border-[var(--accent-green)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-surface-hover'}
              ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75
            `}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
          >
            <span className="flex items-center gap-inline-md">
              {ICONS[tab.id]}
              <span>{tab.label}</span>
            </span>
            {tab.badge && tab.badge > 0 && (
              <motion.span
                className="ml-inline-sm inline-flex items-center justify-center rounded-full px-inline-sm py-inline-xs text-xs font-semibold text-text-inverse shadow-sm"
                style={BADGE_STYLE}
              >
                {tab.badge}
              </motion.span>
            )}
            {isActive && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: 'var(--brand-gradient)' }}
                layoutId="activeTab"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
};
