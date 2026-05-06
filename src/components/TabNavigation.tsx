import { motion } from 'framer-motion';
import React from 'react';
import { focusRing } from '../lib/focusRing';

export type TabType = 'board' | 'practice' | 'advanced' | 'activity' | 'manual';
type PrimaryTabType = 'board' | 'practice' | 'advanced';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  advancedCount?: number;
}

const ICONS: Record<PrimaryTabType, JSX.Element> = {
  board: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  practice: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  advanced: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 008.92 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.31.22.65.22 1h.38a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
};

const BADGE_STYLE = {
  background: 'var(--brand-gradient)',
};

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  advancedCount = 0,
}) => {
  const handleTabChange = (tab: TabType) => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  };

  const tabs: Array<{ id: PrimaryTabType; label: string; badge?: number }> = [
    { id: 'board', label: 'リポジトリ' },
    { id: 'practice', label: '練習' },
    { id: 'advanced', label: '高度な機能', badge: advancedCount },
  ];

  return (
    <nav
      className="flex gap-inline-sm px-inset-xl bg-surface-primary border-b border-[var(--border-subtle)] transition-colors"
      role="tablist"
      aria-label="ビュー切り替え"
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id || (tab.id === 'advanced' && (activeTab === 'activity' || activeTab === 'manual'));
        const isSecondary = index > 0;
        return (
          <motion.button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`
              relative flex items-center gap-inline-md border-b-2 rounded-sm text-body-sm
              ${isSecondary ? 'px-inset-md py-inset-md' : 'px-inset-lg py-inset-md'}
              ${isActive ? 'text-[var(--accent-green)] font-semibold border-[var(--accent-green)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-surface-hover'}
              ${isSecondary && !isActive ? 'opacity-80' : ''}
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
                className="ml-inline-sm inline-flex items-center justify-center rounded-full px-inline-sm py-inline-xs text-caption font-semibold text-text-inverse shadow-sm"
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
