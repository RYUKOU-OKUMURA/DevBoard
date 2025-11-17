/**
 * AIInstructionDialog - カスタム指示入力ダイアログ
 */

import React, { useState } from 'react';
import type { GitHubBot } from '@/types/githubActions';
import { GlassModal } from './ui/GlassModal';

interface AIInstructionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bot: GitHubBot, instruction?: string) => void;
  isLoading: boolean;
}

export const AIInstructionDialog: React.FC<AIInstructionDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [selectedBot, setSelectedBot] = useState<GitHubBot>('claude-code');
  const [instruction, setInstruction] = useState('');

  const handleSubmit = () => {
    onSubmit(selectedBot, instruction.trim() || undefined);
    setInstruction('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="AIボットを実行"
      className="max-w-2xl"
      tone="light"
    >
      <div className="space-y-stack-lg" onKeyDown={handleKeyDown}>
        {/* ボット選択 */}
        <div>
          <label className="block text-body-sm text-[var(--text-secondary)] mb-stack-xs">
            ボット選択
          </label>
          <div className="flex gap-inline-sm">
            <button
              type="button"
              onClick={() => setSelectedBot('claude-code')}
              disabled={isLoading}
              className={`
                px-inset-md py-inset-sm rounded-md text-body transition
                ${
                  selectedBot === 'claude-code'
                    ? 'bg-brand-purple text-white'
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] hover:bg-[var(--surface-tertiary-hover)]'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                focus-visible:ring-brand-purple focus-visible:ring-offset-[var(--bg-secondary)]
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-pressed={selectedBot === 'claude-code'}
            >
              Claude Code
            </button>
            <button
              type="button"
              onClick={() => setSelectedBot('copilot')}
              disabled={isLoading}
              className={`
                px-inset-md py-inset-sm rounded-md text-body transition
                ${
                  selectedBot === 'copilot'
                    ? 'bg-brand-purple text-white'
                    : 'bg-[var(--surface-tertiary)] text-[var(--text-primary)] hover:bg-[var(--surface-tertiary-hover)]'
                }
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                focus-visible:ring-brand-purple focus-visible:ring-offset-[var(--bg-secondary)]
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-pressed={selectedBot === 'copilot'}
            >
              GitHub Copilot
            </button>
          </div>
        </div>

        {/* カスタム指示入力 */}
        <div>
          <label
            htmlFor="ai-instruction"
            className="block text-body-sm text-[var(--text-secondary)] mb-stack-xs"
          >
            カスタム指示（オプション）
          </label>
          <textarea
            id="ai-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="空白の場合はデフォルトメッセージが送信されます"
            className={`
              w-full h-32 px-inset-md py-inset-sm
              bg-[var(--surface-tertiary)] rounded-md text-body
              text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
              resize-none border border-[var(--border-subtle)]
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-brand-purple focus-visible:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              transition
            `}
            disabled={isLoading}
            maxLength={2000}
            aria-describedby="ai-instruction-hint"
          />
          <p
            id="ai-instruction-hint"
            className="text-caption text-[var(--text-tertiary)] mt-stack-xs"
          >
            Markdown形式で記述できます。@{selectedBot}メンションは自動で付与されます。
          </p>
          {instruction.length > 0 && (
            <p className="text-caption text-[var(--text-tertiary)] mt-stack-xs">
              {instruction.length} / 2000 文字
            </p>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-inline-sm pt-stack-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`
              px-inset-lg py-inset-md rounded-md text-body
              bg-[var(--surface-tertiary)] text-[var(--text-primary)]
              hover:bg-[var(--surface-tertiary-hover)] transition
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              focus-visible:ring-[var(--border-strong)] focus-visible:ring-offset-[var(--bg-secondary)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className={`
              px-inset-lg py-inset-md rounded-md text-body font-medium
              bg-brand-purple text-white hover:bg-brand-purple-hover
              transition
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
              focus-visible:ring-brand-purple focus-visible:ring-offset-[var(--bg-secondary)]
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-live="polite"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-inline-xs">
                <span className="inline-block animate-spin">⏳</span>
                実行中...
              </span>
            ) : (
              '実行'
            )}
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
