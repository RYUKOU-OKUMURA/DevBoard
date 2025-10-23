import React, { useEffect, useRef, useState } from 'react';
import { Repo, ColumnKey } from '../types';
import { RepoCard } from './RepoCard';

interface RepoColumnProps {
  title: string;
  repos: Repo[];
  columnKey: ColumnKey;
  onReorder?: (col: ColumnKey, fromId: string, toId: string) => void;
  onReorderBetween?: (
    fromCol: ColumnKey,
    toCol: ColumnKey,
    fromId: string,
    toId?: string
  ) => void;
  onTitleChange?: (column: ColumnKey, newTitle: string) => void;
}

const COLUMN_COLORS: Record<ColumnKey, { bg: string; border: string; header: string }> = {
  Active: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    header: 'bg-green-100 text-green-800',
  },
  Stale: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    header: 'bg-yellow-100 text-yellow-800',
  },
  Dormant: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    header: 'bg-orange-100 text-orange-800',
  },
  Archived: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    header: 'bg-gray-100 text-gray-800',
  },
};

export const RepoColumn: React.FC<RepoColumnProps> = ({
  title,
  repos,
  columnKey,
  onReorder,
  onReorderBetween,
  onTitleChange,
}) => {
  const colors = COLUMN_COLORS[columnKey];
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const shouldCommitOnBlur = useRef(true);
  const canEditTitle = Boolean(onTitleChange);

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
    // Currently not handling drop to end explicitly for cross-column.
  };

  return (
    <div className="flex-1 min-w-[320px] flex flex-col">
      {/* Column Header */}
      <div
        className={`${colors.header} px-4 py-3 rounded-t-lg font-semibold flex items-center justify-between shadow-sm`}
      >
        <div className="flex-1 pr-3">
          {canEditTitle ? (
            isEditingTitle ? (
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="w-full bg-white/80 px-2 py-1 rounded text-base font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="カテゴリタイトル"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={handleStartEditing}
                className="text-left w-full font-semibold text-inherit focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 rounded"
                title="クリックしてタイトルを編集"
              >
                {title}
              </button>
            )
          ) : (
            <span>{title}</span>
          )}
        </div>
        <span className="bg-white bg-opacity-50 px-2 py-1 rounded text-sm">
          {repos.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        className={`${colors.bg} ${colors.border} border-2 border-t-0 rounded-b-lg flex-1 overflow-y-auto p-3 space-y-3`}
        onDragOver={handleDragOver}
        onDrop={handleDropOnColumnEnd}
      >
        {repos.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
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
            >
              <RepoCard repo={repo} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};
