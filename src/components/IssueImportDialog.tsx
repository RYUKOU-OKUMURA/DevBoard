/**
 * IssueImportDialog component - Dialog for importing GitHub Issues as Todos
 */

import React, { useState, useEffect } from 'react';
import type { GitHubIssue } from '../types';
import { GlassModal } from './ui/GlassModal';
import { focusRing } from '../lib/focusRing';

interface IssueImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  repoNameWithOwner: string;
  onImport: (issueNumbers: number[]) => Promise<void>;
  fetchIssues: (repoNameWithOwner: string) => Promise<GitHubIssue[]>;
  existingIssueNumbers: Set<number>;
}

export const IssueImportDialog: React.FC<IssueImportDialogProps> = ({
  isOpen,
  onClose,
  repoNameWithOwner,
  onImport,
  fetchIssues,
  existingIssueNumbers,
}) => {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open');

  // Load issues when dialog opens
  useEffect(() => {
    if (isOpen && repoNameWithOwner) {
      loadIssues();
    }
  }, [isOpen, repoNameWithOwner]);

  // Load issues from GitHub
  const loadIssues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedIssues = await fetchIssues(repoNameWithOwner);
      setIssues(fetchedIssues);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Issueの取得に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    // Filter by state
    if (filter === 'open' && issue.state !== 'OPEN') return false;
    if (filter === 'closed' && issue.state !== 'CLOSED') return false;

    // Filter out already imported issues
    if (existingIssueNumbers.has(issue.number)) return false;

    return true;
  });

  // Handle issue selection
  const handleToggleIssue = (issueNumber: number) => {
    const newSelected = new Set(selectedIssues);
    if (newSelected.has(issueNumber)) {
      newSelected.delete(issueNumber);
    } else {
      newSelected.add(issueNumber);
    }
    setSelectedIssues(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIssues.size === filteredIssues.length) {
      setSelectedIssues(new Set());
    } else {
      setSelectedIssues(new Set(filteredIssues.map((i) => i.number)));
    }
  };

  // Handle import
  const handleImport = async () => {
    if (selectedIssues.size === 0) return;

    setIsImporting(true);
    try {
      await onImport(Array.from(selectedIssues));
      setSelectedIssues(new Set());
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'インポートに失敗しました'
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Issueをインポート"
      className="max-w-3xl"
      tone="light"
    >
      <div className="space-y-stack-lg">
        {/* Repository name */}
        <div>
          <p className="text-body-sm text-[var(--text-secondary)]">
            リポジトリ: <span className="font-medium text-[var(--text-primary)]">{repoNameWithOwner}</span>
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-inline-md">
          <span className="text-body-sm text-[var(--text-secondary)]">表示:</span>
          <div className="flex gap-inline-xs">
            {(['all', 'open', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`
                  px-3 py-1 rounded-lg text-body-sm
                  transition-colors
                  ${
                    filter === f
                      ? 'bg-[var(--accent-green)] text-white'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)]'
                  }
                  ${focusRing()}
                `}
              >
                {f === 'all' ? 'すべて' : f === 'open' ? 'オープン' : 'クローズ済み'}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-inset-md bg-[#EF4444]/10 border border-[#EF4444] rounded-lg">
            <p className="text-body-sm text-[#EF4444]">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-stack-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-green)] mx-auto mb-stack-sm" />
              <p className="text-body-sm text-[var(--text-secondary)]">
                Issueを読み込み中...
              </p>
            </div>
          </div>
        )}

        {/* Issue list */}
        {!isLoading && filteredIssues.length > 0 && (
          <>
            {/* Select all */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className={`text-body-sm text-[var(--accent-green)] hover:underline ${focusRing()}`}
              >
                {selectedIssues.size === filteredIssues.length
                  ? 'すべて選択解除'
                  : 'すべて選択'}
              </button>
              <span className="text-caption text-[var(--text-secondary)]">
                {selectedIssues.size} / {filteredIssues.length} 件選択中
              </span>
            </div>

            {/* Issue list */}
            <div className="max-h-96 overflow-y-auto space-y-stack-xs border border-[var(--border-subtle)] rounded-lg p-inset-sm">
              {filteredIssues.map((issue) => (
                <label
                  key={issue.number}
                  className={`
                    flex items-start gap-inline-sm
                    p-inset-sm rounded-lg
                    cursor-pointer
                    transition-colors
                    ${
                      selectedIssues.has(issue.number)
                        ? 'bg-[var(--accent-green)]/10 border-2 border-[var(--accent-green)]'
                        : 'bg-[var(--surface-secondary)] border-2 border-transparent hover:border-[var(--accent-green-border)]'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedIssues.has(issue.number)}
                    onChange={() => handleToggleIssue(issue.number)}
                    className="mt-1 w-5 h-5 rounded border-2 border-[var(--border-subtle)] text-[var(--accent-green)] focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-inline-sm mb-stack-xs">
                      <span className="text-body font-medium text-[var(--text-primary)]">
                        #{issue.number}
                      </span>
                      <span
                        className={`
                          text-caption px-2 py-0.5 rounded
                          ${
                            issue.state === 'OPEN'
                              ? 'text-[var(--accent-green)] bg-[var(--accent-green)]/10'
                              : 'text-[var(--text-secondary)] bg-[var(--surface-tertiary)]'
                          }
                        `}
                      >
                        {issue.state === 'OPEN' ? 'オープン' : 'クローズ'}
                      </span>
                    </div>
                    <p className="text-body-sm text-[var(--text-primary)] mb-stack-xs">
                      {issue.title}
                    </p>
                    {issue.labels.length > 0 && (
                      <div className="flex gap-inline-xs flex-wrap">
                        {issue.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.name}
                            className="text-caption px-2 py-0.5 rounded bg-[var(--surface-primary)] text-[var(--text-secondary)]"
                          >
                            {label.name}
                          </span>
                        ))}
                        {issue.labels.length > 3 && (
                          <span className="text-caption text-[var(--text-tertiary)]">
                            +{issue.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!isLoading && filteredIssues.length === 0 && (
          <div className="text-center py-stack-xl">
            <p className="text-body text-[var(--text-secondary)]">
              インポート可能なIssueがありません
            </p>
            <p className="text-caption text-[var(--text-tertiary)] mt-stack-xs">
              すべてのIssueがすでにインポート済みです
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-inline-md pt-stack-md border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className={`
              flex-1 px-inset-lg py-inset-md
              border border-[var(--border-subtle)]
              rounded-lg
              text-[var(--text-secondary)]
              hover:bg-[var(--surface-secondary)]
              transition-colors
              ${focusRing()}
            `}
          >
            キャンセル
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIssues.size === 0 || isImporting}
            className={`
              flex-1 px-inset-lg py-inset-md
              rounded-lg
              bg-[var(--accent-green)]
              text-white font-medium
              hover:bg-[var(--accent-green-hover)]
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${focusRing()}
            `}
          >
            {isImporting
              ? 'インポート中...'
              : `${selectedIssues.size}件をインポート`}
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
