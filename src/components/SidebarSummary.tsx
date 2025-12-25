/**
 * SidebarSummary - Left sidebar with KPI summary cards
 * NexusHub-inspired design with collapsible functionality
 */

import React from 'react';
import { focusRing } from '../lib/focusRing';

interface SummaryStats {
  /** Total number of repositories */
  totalRepos: number;
  /** Number of active repositories */
  activeRepos: number;
  /** TODO statistics */
  todoStats: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
  };
  /** Sync statistics */
  syncStats: {
    synced: number;
    pending: number;
    error: number;
  };
}

interface SidebarSummaryProps {
  /** Summary statistics */
  stats: SummaryStats;
  /** Whether the sidebar is collapsed */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseToggle?: () => void;
  /** Callback when a summary card is clicked */
  onCardClick?: (type: 'repos' | 'todos' | 'overdue' | 'sync') => void;
  /** Class name */
  className?: string;
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  progress?: {
    value: number;
    max: number;
  };
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  label,
  value,
  subValue,
  variant = 'default',
  onClick,
  progress,
}) => {
  const variantStyles = {
    default: {
      iconBg: 'bg-[var(--accent-blue-muted)]',
      iconColor: 'text-[var(--accent-blue)]',
      valueColor: 'text-[var(--text-primary)]',
    },
    success: {
      iconBg: 'bg-[var(--accent-green-muted)]',
      iconColor: 'text-[var(--accent-green)]',
      valueColor: 'text-[var(--accent-green-emphasis)]',
    },
    warning: {
      iconBg: 'bg-[var(--accent-yellow-muted)]',
      iconColor: 'text-[var(--accent-yellow)]',
      valueColor: 'text-[var(--accent-yellow-emphasis)]',
    },
    danger: {
      iconBg: 'bg-[var(--accent-red-muted)]',
      iconColor: 'text-[var(--accent-red)]',
      valueColor: 'text-[var(--accent-red-emphasis)]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      className={`
        w-full p-3
        bg-[var(--bg-primary)]
        border border-[var(--border-subtle)]
        rounded-xl
        text-left
        transition-all duration-200
        hover:border-[var(--accent-green-border)]
        hover:shadow-sm
        hover:-translate-y-0.5
        ${focusRing.default}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${styles.iconBg} ${styles.iconColor} flex items-center justify-center`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-caption text-[var(--text-muted)] uppercase tracking-wide mb-0.5">
            {label}
          </div>
          <div className={`text-title-3 font-bold ${styles.valueColor}`}>
            {value}
          </div>
          {subValue && (
            <div className="text-caption text-[var(--text-muted)] mt-0.5">
              {subValue}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="mt-3">
          <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                variant === 'success'
                  ? 'bg-[var(--accent-green)]'
                  : variant === 'warning'
                  ? 'bg-[var(--accent-yellow)]'
                  : variant === 'danger'
                  ? 'bg-[var(--accent-red)]'
                  : 'bg-[var(--accent-blue)]'
              }`}
              style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
};

export const SidebarSummary: React.FC<SidebarSummaryProps> = ({
  stats,
  isCollapsed = false,
  onCollapseToggle,
  onCardClick,
  className = '',
}) => {
  const todoCompletionRate = stats.todoStats.total > 0
    ? Math.round((stats.todoStats.done / stats.todoStats.total) * 100)
    : 0;

  const handleFeedbackClick = () => {
    const formUrl = import.meta.env.VITE_FEEDBACK_FORM_URL || 
      'https://docs.google.com/forms/d/e/1FAIpQLSeC_TH4d9D9CGcIVPBVCWZyOt_gMHFaQijv04yLf5YK0d8hcA/viewform?usp=header';
    window.open(formUrl, '_blank', 'noopener,noreferrer');
  };

  if (isCollapsed) {
    return (
      <div
        className={`
          flex flex-col items-center py-4 gap-4
          bg-[var(--bg-secondary)]
          border-r border-[var(--border-subtle)]
          transition-all duration-200
          ${className}
        `}
      >
        {/* Expand button */}
        <button
          onClick={onCollapseToggle}
          className={`
            p-2 rounded-lg
            text-[var(--text-muted)] hover:text-[var(--text-primary)]
            hover:bg-[var(--bg-hover)]
            transition-colors
            ${focusRing.default}
          `}
          aria-label="サイドバーを展開"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* Compact indicators */}
        <div className="flex flex-col gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-blue-muted)] flex items-center justify-center text-[var(--accent-blue)] font-bold text-body-sm">
            {stats.activeRepos}
          </div>
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-green-muted)] flex items-center justify-center text-[var(--accent-green)] font-bold text-body-sm">
            {todoCompletionRate}%
          </div>
          {stats.todoStats.overdue > 0 && (
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-red-muted)] flex items-center justify-center text-[var(--accent-red)] font-bold text-body-sm">
              {stats.todoStats.overdue}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        flex flex-col
        w-64 p-4
        bg-[var(--bg-secondary)]
        border-r border-[var(--border-subtle)]
        overflow-y-auto
        transition-all duration-200
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-body-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          サマリー
        </h2>
        <button
          onClick={onCollapseToggle}
          className={`
            p-1.5 rounded-lg
            text-[var(--text-muted)] hover:text-[var(--text-primary)]
            hover:bg-[var(--bg-hover)]
            transition-colors
            ${focusRing.default}
          `}
          aria-label="サイドバーを折りたたむ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-col gap-3">
        {/* Active Repos */}
        <SummaryCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          label="アクティブリポジトリ"
          value={stats.activeRepos}
          subValue={`/ ${stats.totalRepos} リポジトリ`}
          variant="default"
          onClick={() => onCardClick?.('repos')}
        />

        {/* TODO Progress */}
        <SummaryCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="TODO進捗"
          value={`${stats.todoStats.done}/${stats.todoStats.total}`}
          subValue={`${todoCompletionRate}% 完了`}
          variant="success"
          onClick={() => onCardClick?.('todos')}
          progress={{
            value: stats.todoStats.done,
            max: stats.todoStats.total || 1,
          }}
        />

        {/* Overdue */}
        {stats.todoStats.overdue > 0 && (
          <SummaryCard
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="期限切迫"
            value={`${stats.todoStats.overdue} 件`}
            subValue="今週期限"
            variant="danger"
            onClick={() => onCardClick?.('overdue')}
          />
        )}

        {/* Sync Status */}
        <SummaryCard
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          label="Issue同期"
          value={`${stats.syncStats.synced} 同期中`}
          subValue={stats.syncStats.error > 0 ? `${stats.syncStats.error} エラー` : undefined}
          variant={stats.syncStats.error > 0 ? 'warning' : 'default'}
          onClick={() => onCardClick?.('sync')}
        />
      </div>

      {/* Feedback */}
      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
        <h3 className="text-caption font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
          フィードバック
        </h3>
        <button
          type="button"
          onClick={handleFeedbackClick}
          className={`
            w-full flex items-center gap-2 px-3 py-2
            text-body-sm text-[var(--text-secondary)]
            hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]
            rounded-lg
            transition-colors motion-reduce:transition-none
            ${focusRing.default}
          `}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span>フィードバックを送る</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarSummary;
