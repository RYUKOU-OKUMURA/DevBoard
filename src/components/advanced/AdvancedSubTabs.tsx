import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import type { AdvancedSubTab } from '../../types';
import { focusRing } from '../../lib/focusRing';

interface AdvancedSubTabsProps {
  activeSubTab: AdvancedSubTab;
  onSubTabChange: (subTab: AdvancedSubTab) => void;
  activityCount?: number;
  manualRepoCount?: number;
}

interface SubTabItem {
  id: AdvancedSubTab;
  label: string;
  badge?: number;
  icon: React.ReactNode;
}

const OVERVIEW_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const LEGACY_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="14" rx="1" />
    <rect x="10" y="3" width="6" height="9" rx="1" />
    <rect x="17" y="3" width="4" height="11" rx="1" />
  </svg>
);

const ACTIVITY_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const MANUAL_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const TODO_AI_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V12L14 14" />
    <circle cx="12" cy="12" r="10" />
    <path d="M9 2h6" />
  </svg>
);

export function AdvancedSubTabs({
  activeSubTab,
  onSubTabChange,
  activityCount = 0,
  manualRepoCount = 0,
}: AdvancedSubTabsProps) {
  const shouldReduceMotion = useReducedMotion();

  const tabs: SubTabItem[] = [
    { id: 'overview', label: '概要', icon: OVERVIEW_ICON },
    { id: 'legacy', label: '旧カンバン', icon: LEGACY_ICON },
    { id: 'activity', label: 'Activity', icon: ACTIVITY_ICON, badge: activityCount },
    { id: 'manual', label: '手動追加', icon: MANUAL_ICON, badge: manualRepoCount },
    { id: 'todoai', label: 'TODO・AI', icon: TODO_AI_ICON },
  ];

  const handleSubTabChange = (subTab: AdvancedSubTab) => {
    if (subTab !== activeSubTab) {
      onSubTabChange(subTab);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }

    event.preventDefault();

    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : event.key === 'ArrowRight'
            ? (currentIndex + 1) % tabs.length
            : (currentIndex - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) {
      return;
    }

    handleSubTabChange(nextTab.id);
    event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelector<HTMLButtonElement>(`[data-sub-tab-id="${nextTab.id}"]`)
      ?.focus();
  };

  return (
    <nav
      className="flex gap-inline-sm overflow-x-auto border-b border-[var(--border-subtle)] bg-surface-secondary px-inset-sm transition-colors motion-reduce:transition-none sm:px-inset-xl"
      role="tablist"
      aria-label="高度な機能のサブタブ"
    >
      {tabs.map((tab, index) => {
        const isActive = activeSubTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            type="button"
            onClick={() => handleSubTabChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            data-sub-tab-id={tab.id}
            className={`relative flex shrink-0 items-center gap-inline-sm rounded-sm border-b-2 px-inset-md py-inset-sm text-body-sm transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] focus-visible:ring-opacity-75 ${
              isActive
                ? 'text-[var(--accent-green)] font-semibold border-[var(--accent-green)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:bg-surface-hover'
            }`}
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: [0.4, 0, 0.2, 1] }}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
          >
            <span className="flex items-center gap-inline-sm">
              {tab.icon}
              <span>{tab.label}</span>
            </span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <motion.span
                className="ml-inline-sm inline-flex min-w-6 items-center justify-center rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inline-sm py-inline-xs text-caption font-semibold text-[var(--accent-blue-emphasis)]"
              >
                {tab.badge}
              </motion.span>
            )}
            {isActive && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ background: 'var(--accent-green)' }}
                layoutId="activeAdvancedSubTab"
                transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
