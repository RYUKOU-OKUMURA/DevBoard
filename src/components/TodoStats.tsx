/**
 * TodoStats component - Display todo statistics
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { TodoStats } from '../types';

interface TodoStatsProps {
  stats: TodoStats | null;
  compact?: boolean;
}

export const TodoStats: React.FC<TodoStatsProps> = ({
  stats,
  compact = false,
}) => {
  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: '合計',
      value: stats.total,
      color: 'var(--text-primary)',
      bgColor: 'var(--surface-secondary)',
      icon: '📝',
    },
    {
      label: '未着手',
      value: stats.todo,
      color: '#6B7280',
      bgColor: 'rgba(107, 114, 128, 0.1)',
      icon: '⏸️',
    },
    {
      label: '進行中',
      value: stats.inProgress,
      color: '#F97316',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      icon: '⚡',
    },
    {
      label: '完了',
      value: stats.done,
      color: 'var(--accent-green)',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      icon: '✅',
    },
  ];

  const alertItems = [
    {
      label: '期限切れ',
      value: stats.overdue,
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      icon: '🚨',
      show: stats.overdue > 0,
    },
    {
      label: '今日期限',
      value: stats.dueToday,
      color: '#F97316',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      icon: '📅',
      show: stats.dueToday > 0,
    },
    {
      label: '今週期限',
      value: stats.dueThisWeek,
      color: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      icon: '📆',
      show: stats.dueThisWeek > 0,
    },
  ].filter((item) => item.show);

  // Compact view (horizontal)
  if (compact) {
    return (
      <div className="flex flex-wrap gap-inline-sm">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-inline-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: item.bgColor }}
          >
            <span className="text-body-sm">{item.icon}</span>
            <span className="text-body-sm font-medium" style={{ color: item.color }}>
              {item.value}
            </span>
            <span className="text-caption text-[var(--text-tertiary)]">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>
    );
  }

  // Full view (grid)
  return (
    <div className="space-y-stack-lg">
      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-inline-md">
        {statItems.map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="p-inset-md rounded-lg border border-[var(--border-subtle)]"
            style={{ backgroundColor: item.bgColor }}
          >
            <div className="flex items-center justify-between mb-stack-xs">
              <span className="text-title-2">{item.icon}</span>
              <span
                className="text-display-lg font-bold"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
            </div>
            <div className="text-body-sm text-[var(--text-secondary)]">
              {item.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Alert stats (if any) */}
      {alertItems.length > 0 && (
        <div>
          <h3 className="text-body font-medium text-[var(--text-primary)] mb-stack-sm">
            注意が必要なタスク
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-inline-md">
            {alertItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-inline-sm p-inset-md rounded-lg border-2"
                style={{
                  backgroundColor: item.bgColor,
                  borderColor: item.color,
                }}
              >
                <span className="text-title-2">{item.icon}</span>
                <div className="flex-1">
                  <div
                    className="text-display-md font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div className="text-caption text-[var(--text-secondary)]">
                    {item.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {stats.total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-stack-xs">
            <span className="text-body-sm text-[var(--text-secondary)]">
              進捗状況
            </span>
            <span className="text-body-sm font-medium text-[var(--text-primary)]">
              {Math.round((stats.done / stats.total) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(stats.done / stats.total) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--accent-green), var(--brand-purple))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
