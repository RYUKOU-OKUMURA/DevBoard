import React from 'react';
import { Repo } from '../types';
import { timeAgo } from '../lib/timeAgo';

interface RepoCardProps {
  repo: Repo;
  onHide?: (repoId: string) => void;
  showDeleteButton?: boolean;
  showCheckbox?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({
  repo,
  onHide,
  showDeleteButton = false,
  showCheckbox = false,
  isSelected = false,
  onSelect,
  onDelete,
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

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(repo.id);
    }
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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`リポジトリを開く ${repo.nameWithOwner}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        bg-surface-primary border rounded-xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 motion-safe:transition-all motion-safe:duration-200 motion-reduce:transition-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]
        ${isSelected ? 'border-[var(--accent-green)] bg-opacity-90' : 'border-[var(--border-subtle)] hover:border-[var(--accent-green)]'}
      `}
    >
      {/* Repository Title and Actions */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* Checkbox */}
          {showCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxClick}
              className="w-5 h-5 rounded border-[var(--border-subtle)] cursor-pointer accent-[var(--accent-green)]"
              aria-label={`${repo.nameWithOwner} を選択`}
            />
          )}
          <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">
            <span className="text-[var(--accent-green)]">{repoName}</span>
            <span className="text-[var(--text-muted)]"> / {owner}</span>
          </h3>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {/* Privacy Badge */}
          {repo.isPrivate ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)] border border-[var(--accent-yellow-border)] shadow-sm">
              Private
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)] shadow-sm">
              Public
            </span>
          )}

          {/* Delete Button */}
          {showDeleteButton && onDelete && (
            <button
              onClick={handleDeleteClick}
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-red-100 hover:text-red-600 text-[var(--text-muted)] transition-colors"
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
              className="inline-flex items-center justify-center w-5 h-5 rounded hover:bg-surface-hover text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
        <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">
          {repo.description}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mb-2 flex-wrap">
        {/* Primary Language */}
        {repo.primaryLanguage && (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-blue)]"></span>
            <span>{repo.primaryLanguage}</span>
          </div>
        )}

        {/* Stars */}
        {repo.stargazers_count !== undefined && repo.stargazers_count > 0 && (
          <div className="flex items-center gap-1.5">
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
        <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-xs">
          <span>{timeAgo(repo.pushedAt)}</span>
        </div>
      </div>

      {/* Topics */}
      {displayTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {displayTopics.map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] border border-[var(--accent-blue-border)] shadow-sm"
            >
              #{topic}
            </span>
          ))}
          {hasMoreTopics && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-surface-tertiary text-[var(--text-muted)] border border-[var(--border-subtle)]">
              +{repo.topics.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
