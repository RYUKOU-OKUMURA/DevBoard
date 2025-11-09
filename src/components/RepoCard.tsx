import { motion } from 'framer-motion';
import React from 'react';
import { ColumnKey, Repo } from '../types';
import { timeAgo } from '../lib/timeAgo';
import { focusRing } from '../lib/focusRing';

interface RepoCardProps {
  repo: Repo;
  onHide?: (repoId: string) => void;
  showDeleteButton?: boolean;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  columnKey?: ColumnKey | string;
}

export const RepoCard: React.FC<RepoCardProps> = ({
  repo,
  onHide,
  showDeleteButton = false,
  showCheckbox = false,
  isSelected = false,
  onSelect,
  onDelete,
  columnKey,
}) => {
  const handleClick = () => {
    window.open(repo.htmlUrl, '_blank', 'noopener,noreferrer');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHide) {
      onHide(repo.id);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(repo.id);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCheckboxContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(repo.id);
    }
  };

  // Extract owner and repo name
  const [owner, repoName] = repo.nameWithOwner.split('/');

  // Get max 3 topics
  const displayTopics = repo.topics.slice(0, 3);
  const hasMoreTopics = repo.topics.length > 3;
  const accentColor = columnKey === 'Active' ? 'var(--brand-red)' : 'var(--brand-gradient)';
  const hoverShadowColor =
    columnKey === 'Active' ? 'var(--brand-red-soft)' : 'var(--brand-purple-soft)';
  const selectionClasses = isSelected
    ? 'border-[var(--accent-green)] bg-opacity-95 ring-2 ring-[var(--accent-green)] ring-opacity-25 shadow-lg'
    : 'border-[var(--border-subtle)] hover:border-[var(--accent-green-border)]';

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`リポジトリを開く ${repo.nameWithOwner}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      whileDrag={{
        scale: 1.05,
        boxShadow: `0 20px 60px var(--brand-purple-glow), 0 10px 30px rgba(0,0,0,0.2)`,
        backgroundColor: 'rgba(var(--bg-surface-rgb), 0.8)',
        backdropFilter: 'blur(8px)',
        cursor: 'grabbing',
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      }}
      transition={{
        opacity: { duration: 0.3, ease: [0, 0, 0.2, 1] },
        y: { duration: 0.3, ease: [0, 0, 0.2, 1] },
        layout: { type: 'spring', stiffness: 300, damping: 30 },
      }}
      whileHover={{
        y: -4,
        boxShadow: `0 12px 40px ${hoverShadowColor}, 0 6px 20px rgba(0,0,0,0.1)`,
        transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
      }}
      className={`
        relative
        group
        overflow-hidden
        cursor-pointer
        bg-surface-primary
        border
        rounded-xl
        p-inset-lg
        shadow-sm
        motion-safe:transition-all
        motion-safe:duration-250
        motion-safe:ease-smooth
        motion-reduce:transition-none
        outline-none
        ${focusRing.default}
        focus-visible:ring-[var(--accent-green)]
        focus-visible:ring-opacity-50
        ${selectionClasses}
      `}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 opacity-80 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: accentColor }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-xl"
        style={{ background: 'var(--brushed-metal)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-xl"
        style={{ boxShadow: 'inset 0 0 30px rgba(255,255,255,0.12)' }}
      />
      {/* Repository Title and Actions */}
      <div className="flex items-start justify-between mb-stack-xs">
        <div className="flex-1 min-w-0 flex items-center gap-inline-md">
          {/* Checkbox */}
          {showCheckbox && (
            <div onClick={handleCheckboxContainerClick} className="flex items-center">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={handleCheckboxChange}
                onClick={handleCheckboxClick}
                className={`w-5 h-5 rounded border-[var(--border-subtle)] cursor-pointer accent-[var(--accent-green)] ${focusRing.default} ${focusRing.brand}`}
                aria-label={`${repo.nameWithOwner} を選択`}
              />
            </div>
          )}
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)] truncate">
            <span className="text-[var(--accent-green)]">{repoName}</span>
            <span className="text-[var(--text-muted)]"> / {owner}</span>
          </h3>
        </div>

        <div className="flex items-center gap-inline-xs ml-inline-xs flex-wrap">
          {/* Privacy Badge */}
          {repo.isPrivate ? (
            <span className="inline-flex items-center px-inset-sm py-inline-xs rounded-lg text-caption font-medium bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)] border border-[var(--accent-yellow-border)] shadow-sm transition-colors">
              Private
            </span>
          ) : (
            <span className="inline-flex items-center px-inset-sm py-inline-xs rounded-lg text-caption font-medium bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)] shadow-sm transition-colors">
              Public
            </span>
          )}

          {/* Delete Button */}
          {showDeleteButton && onDelete && (
            <button
              onClick={handleDeleteClick}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-lg hover:bg-[var(--accent-red-muted)] hover:text-[var(--accent-red-emphasis)] text-[var(--text-muted)] transition-colors ${focusRing.default} ${focusRing.danger}`}
              title="削除する"
              aria-label="このリポジトリを削除する"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Hide Button */}
          {onHide && !showDeleteButton && (
            <button
              onClick={handleHideClick}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-lg hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ${focusRing.default} focus-visible:ring-[var(--accent-blue)] focus-visible:ring-opacity-50`}
              title="非表示にする"
              aria-label="このカードを非表示にする"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-body-sm text-[var(--text-muted)] mb-stack-sm line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-inline-md text-caption text-[var(--text-muted)] mb-stack-xs flex-wrap">
        {/* Primary Language */}
        {repo.primaryLanguage && (
          <div className="flex items-center gap-inline-xs font-medium">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-blue)]"></span>
            <span>{repo.primaryLanguage}</span>
          </div>
        )}

        {/* Stars */}
        {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
          <div className="flex items-center gap-inline-xs">
            <svg
              className="w-3.5 h-3.5 text-[var(--accent-yellow)]"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
              viewBox="0 0 24 24"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{repo.stargazers_count}</span>
          </div>
        )}

        {/* Last Updated */}
        <div className="flex items-center gap-inline-xs text-caption text-[var(--text-muted)]">
          <span>{timeAgo(repo.pushedAt)}</span>
        </div>
      </div>

      {/* Topics */}
      {displayTopics.length > 0 && (
        <div className="flex flex-wrap gap-inline-sm">
          {displayTopics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-inset-md py-inline-xs rounded-lg text-caption font-medium bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] border border-[var(--accent-blue-border)] shadow-sm transition-colors"
            >
              #{topic}
            </span>
          ))}
          {hasMoreTopics && (
            <span className="inline-flex items-center px-inline-md py-inline-xs rounded-lg text-caption font-medium bg-surface-tertiary text-[var(--text-muted)] border border-[var(--border-subtle)]">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
