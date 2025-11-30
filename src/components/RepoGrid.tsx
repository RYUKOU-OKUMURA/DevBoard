/**
 * RepoGrid - Grid view for repositories
 * Displays repositories in a compact grid layout
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Repo } from '../types';
import { timeAgo } from '../lib/timeAgo';
import { focusRing } from '../lib/focusRing';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTagsContext } from '../contexts/TagsContext';
import { TagBadge } from './TagBadge';

interface RepoGridProps {
  repos: Repo[];
  isLoading?: boolean;
}

export const RepoGrid: React.FC<RepoGridProps> = ({
  repos,
  isLoading = false,
}) => {
  const { selectRepo } = useWorkspace();
  const { getTagObjectsForRepo } = useTagsContext();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-40 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 opacity-30 text-[var(--text-muted)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <p className="text-body-sm text-[var(--text-muted)]">リポジトリがありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 overflow-auto">
      {repos.map((repo, index) => (
        <GridCard
          key={repo.id}
          repo={repo}
          tags={getTagObjectsForRepo(repo.id)}
          onSelect={() => selectRepo(repo)}
          delay={index * 0.02}
        />
      ))}
    </div>
  );
};

interface GridCardProps {
  repo: Repo;
  tags: Array<{ id: string; name: string; color: string }>;
  onSelect: () => void;
  delay?: number;
}

const GridCard: React.FC<GridCardProps> = ({
  repo,
  tags,
  onSelect,
  delay = 0,
}) => {
  const [owner, repoName] = repo.nameWithOwner.split('/');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className={`
        group relative
        bg-[var(--bg-primary)]
        border border-[var(--border-subtle)]
        rounded-xl
        overflow-hidden
        hover:border-[var(--accent-green-border)]
        hover:shadow-md
        transition-all duration-200
        cursor-pointer
        ${focusRing.default}
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Top color bar based on activity */}
      <div
        className="h-1"
        style={{
          background: getActivityGradient(repo.pushedAt),
        }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-body-sm font-semibold text-[var(--text-primary)] truncate">
              {repoName}
            </h3>
            <p className="text-caption text-[var(--text-muted)] truncate">
              {owner}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {repo.isPrivate && (
              <span className="px-1.5 py-0.5 text-[10px] bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)] rounded border border-[var(--accent-yellow-border)]">
                Private
              </span>
            )}
            {repo.isArchived && (
              <span className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded border border-[var(--border-subtle)]">
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-caption text-[var(--text-secondary)] line-clamp-2 mb-3">
            {repo.description}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 2).map((tag) => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
            {tags.length > 2 && (
              <span className="text-caption text-[var(--text-muted)]">+{tags.length - 2}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-caption text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            {repo.primaryLanguage && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-blue)]" />
                {repo.primaryLanguage}
              </span>
            )}
            {typeof repo.stargazers_count === 'number' && repo.stargazers_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-[var(--accent-yellow)]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3.5 14.45 9h5.55l-4.5 3.3 1.7 5.2L12 14.7 6.8 17.5 8.5 12.3 4 9h5.55z" />
                </svg>
                {repo.stargazers_count}
              </span>
            )}
          </div>
          <span>{timeAgo(repo.pushedAt)}</span>
        </div>
      </div>

      {/* Hover action */}
      <div className="absolute inset-0 bg-[var(--accent-green)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
};

function getActivityGradient(pushedAt: string): string {
  const daysSinceUpdate = Math.floor(
    (Date.now() - new Date(pushedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceUpdate <= 7) {
    return 'linear-gradient(90deg, var(--accent-green), var(--accent-green-emphasis))';
  } else if (daysSinceUpdate <= 30) {
    return 'linear-gradient(90deg, var(--accent-yellow), var(--accent-yellow-emphasis))';
  } else if (daysSinceUpdate <= 90) {
    return 'linear-gradient(90deg, var(--accent-orange), var(--accent-orange-emphasis))';
  }
  return 'var(--bg-tertiary)';
}

export default RepoGrid;

