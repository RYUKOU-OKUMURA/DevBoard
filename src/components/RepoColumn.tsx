import React, { useEffect, useRef, useState } from 'react';
import { Repo, ColumnKey } from '../types';
import { RepoCard } from './RepoCard';

interface RepoColumnProps {
  title: string;
  repos: Repo[];
  columnKey: ColumnKey | string; // Support both ColumnKey and custom column names
  onReorder?: (col: ColumnKey | string, fromId: string, toId?: string) => void;
  onReorderBetween?: (
    fromCol: ColumnKey | string,
    toCol: ColumnKey | string,
    fromId: string,
    toId?: string
  ) => void;
  onTitleChange?: (column: ColumnKey | string, newTitle: string) => void;
  onHide?: (repoId: string) => void;
  isVisible?: boolean;
  onToggleVisibility?: (columnKey: ColumnKey | string) => void;
  renderRepoCard?: (repo: Repo) => React.ReactNode;
}

const COLUMN_CUSTOMIZATION_HELP_KEY = 'column-customization-help-shown';

const COLUMN_COLORS: Record<
  ColumnKey,
  {
    headerBg: string;
    headerText: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  Active: {
    headerBg: 'bg-accent-green-muted',
    headerText: 'text-accent-green-strong',
    border: 'border-accent-green-border',
    badgeBg: 'bg-accent-green-muted',
    badgeText: 'text-accent-green-strong',
  },
  Stale: {
    headerBg: 'bg-accent-yellow-muted',
    headerText: 'text-accent-yellow-strong',
    border: 'border-accent-yellow-border',
    badgeBg: 'bg-accent-yellow-muted',
    badgeText: 'text-accent-yellow-strong',
  },
  Dormant: {
    headerBg: 'bg-accent-orange-muted',
    headerText: 'text-accent-orange-strong',
    border: 'border-accent-orange-border',
    badgeBg: 'bg-accent-orange-muted',
    badgeText: 'text-accent-orange-strong',
  },
  Archived: {
    headerBg: 'bg-accent-red-muted',
    headerText: 'text-accent-red-strong',
    border: 'border-accent-red-border',
    badgeBg: 'bg-accent-red-muted',
    badgeText: 'text-accent-red-strong',
  },
};

// Default colors for custom columns (ManualColumnKey)
const DEFAULT_COLUMN_COLORS = {
  headerBg: 'bg-accent-blue-muted',
  headerText: 'text-accent-blue-strong',
  border: 'border-accent-blue-border',
  badgeBg: 'bg-accent-blue-muted',
  badgeText: 'text-accent-blue-strong',
};

export const RepoColumn: React.FC<RepoColumnProps> = ({
  title,
  repos,
  columnKey,
  onReorder,
  onReorderBetween,
  onTitleChange,
  onHide,
  isVisible = true,
  onToggleVisibility,
  renderRepoCard,
}) => {
  // Use default colors if columnKey is not in COLUMN_COLORS (for custom columns)
  const colors = COLUMN_COLORS[columnKey] || DEFAULT_COLUMN_COLORS;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const shouldCommitOnBlur = useRef(true);
  const canEditTitle = Boolean(onTitleChange);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Show help tooltip on first visit
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem(COLUMN_CUSTOMIZATION_HELP_KEY);
    if (!hasSeenHelp && canEditTitle && repos.length > 0) {
      // Show tooltip after a short delay
      const timer = setTimeout(() => {
        setShowHelpTooltip(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [canEditTitle, repos.length]);

  const handleDismissTooltip = () => {
    setShowHelpTooltip(false);
    localStorage.setItem(COLUMN_CUSTOMIZATION_HELP_KEY, 'true');
  };

  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(title);
    }
  }, [title, isEditingTitle]);

  const handleStartEditing = () => {
    if (!canEditTitle) return;
    shouldCommitOnBlur.current = true;
    setDraftTitle(title);
    setIsEditingTitle(true);
  };

  const handleCancelEditing = () => {
    shouldCommitOnBlur.current = false;
    setDraftTitle(title);
    setIsEditingTitle(false);
  };

  const handleCommitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange?.(columnKey, trimmed);
      setDraftTitle(trimmed);
    } else if (!trimmed) {
      setDraftTitle(title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleBlur = () => {
    if (!canEditTitle) return;
    if (!shouldCommitOnBlur.current) {
      shouldCommitOnBlur.current = true;
      return;
    }
    handleCommitTitle();
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCommitTitle();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelEditing();
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, repoId: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ repoId, fromCol: columnKey }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCard = (
    e: React.DragEvent<HTMLDivElement>,
    targetRepoId: string
  ) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    try {
      const payload = JSON.parse(text) as { repoId: string; fromCol: ColumnKey };
      if (payload && payload.repoId) {
        if (onReorderBetween) {
          onReorderBetween(payload.fromCol, columnKey, payload.repoId, targetRepoId);
        } else if (onReorder && payload.fromCol === columnKey) {
          onReorder(columnKey, payload.repoId, targetRepoId);
        }
      }
    } catch {}
  };

  const handleDropOnColumnEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    try {
      const payload = JSON.parse(text) as { repoId: string; fromCol: ColumnKey };
      if (payload && payload.repoId) {
        onReorderBetween?.(payload.fromCol, columnKey, payload.repoId);
      }
    } catch {}
  };

  return (
    <div className="flex-1 min-w-[320px] flex flex-col transition-colors relative">
      {/* Column Header */}
      <div
        ref={headerRef}
        className={`px-4 py-3 rounded-t-xl font-semibold flex items-center justify-between shadow-sm transition-colors ${colors.headerBg} ${colors.headerText} border border-b-0 ${colors.border}`}
      >
        <div className="flex-1 pr-3">
          {canEditTitle ? (
            isEditingTitle ? (
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="w-full bg-[var(--bg-primary)] px-2 py-1 rounded-lg text-base font-semibold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:ring-opacity-50 transition-all"
                aria-label="カテゴリタイトル"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={handleStartEditing}
                className="text-left w-full font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:ring-offset-1 focus:ring-offset-[var(--bg-secondary)] focus:ring-opacity-50 rounded-lg transition-all"
                title="クリックしてタイトルを編集"
              >
                {title}
              </button>
            )
          ) : (
            <span>{title}</span>
          )}
        </div>
        <span className={`px-2 py-1 rounded-lg text-sm border transition-colors ${colors.border} ${colors.badgeBg} ${colors.badgeText}`}>
          {repos.length}
        </span>
      </div>

      {/* Help Tooltip */}
      {showHelpTooltip && canEditTitle && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 mx-4 animate-subtle-scale">
          <div className="bg-[var(--accent-blue)] text-text-inverse rounded-xl p-4 shadow-lg border border-[var(--accent-blue-border)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">💡 カラムのカスタマイズ</p>
                <p className="text-xs opacity-90">
                  列はドラッグ&ドロップで整理できます。列名をクリックして編集することもできます。
                </p>
              </div>
              <button
                onClick={handleDismissTooltip}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="閉じる"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Content */}
      <div
        className={`bg-surface-secondary border-2 border-t-0 rounded-b-xl flex-1 overflow-y-auto p-3 space-y-3 ${colors.border} shadow-md transition-colors`}
        onDragOver={handleDragOver}
        onDrop={handleDropOnColumnEnd}
      >
        {repos.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 mb-2 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p>リポジトリがありません</p>
            </div>
          </div>
        ) : (
          repos.map((repo) => (
            <div
              key={repo.id}
              draggable
              onDragStart={(e) => handleDragStart(e, repo.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnCard(e, repo.id)}
              className="animate-fade-in"
            >
              {renderRepoCard ? renderRepoCard(repo) : <RepoCard repo={repo} onHide={onHide} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
