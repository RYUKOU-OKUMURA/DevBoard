import React from 'react';
import { motion } from 'framer-motion';
import { focusRing } from '../lib/focusRing';

export interface ActivitySummaryStatsProps {
  stats: {
    issues: {
      open: number;
      closed: number;
      label?: string;
      ariaLabel?: string;
      icon?: React.ReactNode;
    };
    pullRequests: {
      open: number;
      merged: number;
      closed: number;
      label?: string;
      ariaLabel?: string;
      icon?: React.ReactNode;
    };
    todos: {
      todo: number;
      inProgress: number;
      done: number;
      total?: number;
      label?: string;
      ariaLabel?: string;
      icon?: React.ReactNode;
    };
  };
  /** 例: "直近7日" */
  periodLabel?: string;
  /** 見出し文言 (省略時は"Activity & Tasks") */
  title?: string;
  /** 見出し下に置く補足文 (任意) */
  description?: string;
  /** regionラベル (a11y用) */
  ariaLabel?: string;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export const ActivitySummaryStats: React.FC<ActivitySummaryStatsProps> = ({
  stats,
  periodLabel = '直近7日',
  title = 'Activity & Tasks',
  description,
  ariaLabel = 'Activity summary stats',
  className = '',
}) => {
  const issueTotal = stats.issues.open + stats.issues.closed;
  const prTotal = stats.pullRequests.open + stats.pullRequests.merged + stats.pullRequests.closed;
  const todoTotal = stats.todos.total ?? stats.todos.todo + stats.todos.inProgress + stats.todos.done;

  const items = [
    {
      key: 'issues',
      label: stats.issues.label ?? 'Issues',
      value: issueTotal,
      detail: `Open ${stats.issues.open} / Closed ${stats.issues.closed}`,
      ariaLabel:
        stats.issues.ariaLabel ??
        `Issues ${issueTotal}件、Open ${stats.issues.open}件、Closed ${stats.issues.closed}件`,
      icon: stats.issues.icon ?? '📬',
      accent: 'var(--accent-green)',
      accentMuted: 'var(--accent-green-muted)',
    },
    {
      key: 'pulls',
      label: stats.pullRequests.label ?? 'Pull Requests',
      value: prTotal,
      detail: `Open ${stats.pullRequests.open} / Merged ${stats.pullRequests.merged} / Closed ${stats.pullRequests.closed}`,
      ariaLabel:
        stats.pullRequests.ariaLabel ??
        `Pull Requests ${prTotal}件、Open ${stats.pullRequests.open}件、Merged ${stats.pullRequests.merged}件、Closed ${stats.pullRequests.closed}件`,
      icon: stats.pullRequests.icon ?? '🔀',
      accent: 'var(--accent-purple)',
      accentMuted: 'var(--accent-purple-muted)',
    },
    {
      key: 'todos',
      label: stats.todos.label ?? 'My TODOs',
      value: todoTotal,
      detail: `未着手 ${stats.todos.todo} / 進行中 ${stats.todos.inProgress} / 完了 ${stats.todos.done}`,
      ariaLabel:
        stats.todos.ariaLabel ??
        `TODO ${todoTotal}件、未着手 ${stats.todos.todo}件、進行中 ${stats.todos.inProgress}件、完了 ${stats.todos.done}件`,
      icon: stats.todos.icon ?? '✅',
      accent: 'var(--accent-blue)',
      accentMuted: 'var(--accent-blue-muted)',
    },
  ];

  return (
    <section
      aria-label={ariaLabel}
      className={`w-full ${className}`.trim()}
    >
      <div className="flex items-center justify-between mb-stack-sm">
        <div>
          <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          {description && (
            <p className="text-body-sm text-[var(--text-muted)] mt-1">
              {description}
            </p>
          )}
        </div>
        {periodLabel && (
          <span className="inline-flex items-center gap-inline-xs px-inline-sm py-stack-2xs rounded-full bg-[var(--bg-tertiary)] text-caption text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" aria-hidden />
            {periodLabel}
          </span>
        )}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        role="group"
        aria-label="統計カード"
      >
        {items.map((item) => (
          <motion.div
            key={item.key}
            variants={cardVariants}
            className={`
              group
              p-inset-md
              bg-surface-primary
              border border-[var(--border-subtle)]
              rounded-xl
              shadow-sm
              hover:shadow-md
              hover:border-[var(--accent-green-border)]
              hover:-translate-y-0.5
              transition-all duration-200
              ${focusRing.default}
            `}
            role="article"
            aria-label={item.ariaLabel}
            tabIndex={0}
          >
            <div className="flex items-start justify-between mb-stack-xs">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center text-title-2"
                style={{
                  backgroundColor: item.accentMuted,
                  color: item.accent,
                }}
                aria-hidden
              >
                {item.icon}
              </div>
              <div className="text-right">
                <div
                  className="text-display-lg font-bold leading-none"
                  style={{ color: item.accent }}
                  aria-live="polite"
                >
                  {item.value}
                </div>
                <div className="text-caption text-[var(--text-secondary)] mt-1">
                  {item.label}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-caption text-[var(--text-muted)]">
              <span className="truncate">{item.detail}</span>
              <span
                className="ml-inline-sm inline-flex items-center gap-inline-2xs px-inline-xs py-stack-2xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                aria-hidden
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.accent }}
                />
                {periodLabel}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
};
