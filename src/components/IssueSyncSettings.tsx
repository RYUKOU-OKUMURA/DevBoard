/**
 * IssueSyncSettings component - Configure GitHub Issues sync settings
 */

import React from 'react';
import type { IssueSyncConfig } from '../types';
import { GlassModal } from './ui/GlassModal';
import { focusRing } from '../lib/focusRing';

interface IssueSyncSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  config: IssueSyncConfig;
  onUpdate: (updates: Partial<IssueSyncConfig>) => void;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  lastSyncAt?: string;
}

export const IssueSyncSettings: React.FC<IssueSyncSettingsProps> = ({
  isOpen,
  onClose,
  config,
  onUpdate,
  onSyncNow,
  isSyncing = false,
  lastSyncAt,
}) => {
  // Format last sync time
  const formatLastSync = (dateString?: string) => {
    if (!dateString) return '同期されていません';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}時間前`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}日前`;
  };

  // Handle toggle
  const handleToggle = (field: keyof IssueSyncConfig, value: boolean) => {
    onUpdate({ [field]: value });
  };

  // Handle interval change
  const handleIntervalChange = (minutes: number) => {
    onUpdate({ syncInterval: minutes });
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Issue同期設定"
      className="max-w-xl"
      tone="light"
    >
      <div className="space-y-stack-lg">
        {/* Enable sync */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-body font-medium text-[var(--text-primary)]">
              Issue同期を有効化
            </h3>
            <p className="text-body-sm text-[var(--text-secondary)] mt-stack-xs">
              GitHub IssuesとToDoを自動的に同期します
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleToggle('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div
              className={`
                w-11 h-6 rounded-full
                peer peer-focus:ring-2 peer-focus:ring-[var(--accent-green)] peer-focus:ring-opacity-20
                ${
                  config.enabled
                    ? 'bg-[var(--accent-green)]'
                    : 'bg-[var(--surface-tertiary)]'
                }
                after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5
                after:transition-all
                ${config.enabled ? 'after:translate-x-full after:border-white' : ''}
              `}
            />
          </label>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)]" />

        {/* Auto import */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-body font-medium text-[var(--text-primary)]">
              自動インポート
            </h3>
            <p className="text-body-sm text-[var(--text-secondary)] mt-stack-xs">
              新しいIssueを自動的にToDoとして追加
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoImport}
              onChange={(e) => handleToggle('autoImport', e.target.checked)}
              disabled={!config.enabled}
              className="sr-only peer"
            />
            <div
              className={`
                w-11 h-6 rounded-full
                peer peer-focus:ring-2 peer-focus:ring-[var(--accent-green)] peer-focus:ring-opacity-20
                ${
                  config.autoImport && config.enabled
                    ? 'bg-[var(--accent-green)]'
                    : 'bg-[var(--surface-tertiary)]'
                }
                after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5
                after:transition-all
                ${config.autoImport ? 'after:translate-x-full after:border-white' : ''}
                ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </label>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)]" />

        {/* Auto close */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-body font-medium text-[var(--text-primary)]">
              自動クローズ
            </h3>
            <p className="text-body-sm text-[var(--text-secondary)] mt-stack-xs">
              ToDo完了時にIssueを自動的にクローズ
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.autoClose}
              onChange={(e) => handleToggle('autoClose', e.target.checked)}
              disabled={!config.enabled}
              className="sr-only peer"
            />
            <div
              className={`
                w-11 h-6 rounded-full
                peer peer-focus:ring-2 peer-focus:ring-[var(--accent-green)] peer-focus:ring-opacity-20
                ${
                  config.autoClose && config.enabled
                    ? 'bg-[var(--accent-green)]'
                    : 'bg-[var(--surface-tertiary)]'
                }
                after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                after:bg-white after:rounded-full after:h-5 after:w-5
                after:transition-all
                ${config.autoClose ? 'after:translate-x-full after:border-white' : ''}
                ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            />
          </label>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)]" />

        {/* Sync interval */}
        <div>
          <h3 className="text-body font-medium text-[var(--text-primary)] mb-stack-sm">
            同期間隔
          </h3>
          <div className="grid grid-cols-4 gap-inline-sm">
            {[5, 15, 30, 60].map((minutes) => (
              <button
                key={minutes}
                onClick={() => handleIntervalChange(minutes)}
                disabled={!config.enabled}
                className={`
                  px-3 py-2 rounded-lg
                  border-2 transition-all
                  ${
                    config.syncInterval === minutes
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-green-border)]'
                  }
                  ${!config.enabled ? 'opacity-50 cursor-not-allowed' : ''}
                  ${focusRing()}
                `}
              >
                <div className="text-body-sm font-medium">{minutes}分</div>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border-subtle)]" />

        {/* Manual sync */}
        <div>
          <div className="flex items-center justify-between mb-stack-sm">
            <h3 className="text-body font-medium text-[var(--text-primary)]">
              手動同期
            </h3>
            <span className="text-caption text-[var(--text-secondary)]">
              最終同期: {formatLastSync(lastSyncAt || config.lastSyncAt)}
            </span>
          </div>
          <button
            onClick={onSyncNow}
            disabled={!config.enabled || isSyncing}
            className={`
              w-full px-inset-lg py-inset-md
              rounded-lg
              border-2 border-[var(--accent-green)]
              text-[var(--accent-green)]
              hover:bg-[var(--accent-green)] hover:text-white
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${focusRing()}
            `}
          >
            {isSyncing ? '同期中...' : '今すぐ同期'}
          </button>
        </div>

        {/* Info note */}
        <div className="p-inset-md bg-[var(--surface-secondary)] rounded-lg">
          <p className="text-caption text-[var(--text-secondary)]">
            <span className="font-medium">ℹ️ 注意:</span> Issue同期を有効にすると、
            設定した間隔でGitHub APIを呼び出します。API rate limitに注意してください。
          </p>
        </div>
      </div>
    </GlassModal>
  );
};
