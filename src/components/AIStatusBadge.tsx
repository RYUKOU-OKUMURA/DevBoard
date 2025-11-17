/**
 * AIStatusBadge - AI実行ステータスバッジ
 */

import React from 'react';
import type { WorkflowStatus } from '@/types/githubActions';

interface AIStatusBadgeProps {
  status?: WorkflowStatus;
  isLoading?: boolean;
}

export const AIStatusBadge: React.FC<AIStatusBadgeProps> = ({ status, isLoading }) => {
  // ロード中（ワークフローがまだ開始されていない）
  if (isLoading && !status) {
    return (
      <span
        className="inline-flex items-center gap-inline-xs px-inset-sm py-inset-xs rounded-full bg-blue-500/10 text-blue-500 text-caption"
        role="status"
        aria-live="polite"
      >
        <span className="inline-block animate-spin" aria-hidden="true">
          ⏳
        </span>
        トリガー中
      </span>
    );
  }

  // ステータスがない場合は何も表示しない
  if (!status) return null;

  // ステータスごとの設定
  const statusConfig = {
    queued: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-500',
      icon: '⏱️',
      label: 'キュー',
    },
    in_progress: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      icon: '🔄',
      label: '実行中',
    },
    completed: {
      success: {
        bg: 'bg-green-500/10',
        text: 'text-green-500',
        icon: '✅',
        label: '成功',
      },
      failure: {
        bg: 'bg-red-500/10',
        text: 'text-red-500',
        icon: '❌',
        label: '失敗',
      },
      cancelled: {
        bg: 'bg-gray-500/10',
        text: 'text-gray-500',
        icon: '🚫',
        label: 'キャンセル',
      },
      skipped: {
        bg: 'bg-gray-500/10',
        text: 'text-gray-500',
        icon: '⏭️',
        label: 'スキップ',
      },
      timed_out: {
        bg: 'bg-orange-500/10',
        text: 'text-orange-500',
        icon: '⏰',
        label: 'タイムアウト',
      },
    },
  };

  // ステータスに応じた設定を取得
  let config:
    | { bg: string; text: string; icon: string; label: string }
    | undefined;

  if (status.status === 'completed' && status.conclusion) {
    config = statusConfig.completed[status.conclusion];
  } else if (status.status === 'queued' || status.status === 'in_progress') {
    config = statusConfig[status.status];
  }

  // 設定が見つからない場合は何も表示しない
  if (!config) return null;

  return (
    <a
      href={status.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`
        inline-flex items-center gap-inline-xs px-inset-sm py-inset-xs rounded-full
        ${config.bg} ${config.text} text-caption hover:opacity-80 transition
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        focus-visible:ring-current focus-visible:ring-offset-[var(--bg-secondary)]
      `}
      role="status"
      aria-label={`ワークフロー状態: ${config.label}. クリックでGitHub Actionsを開く`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </a>
  );
};
