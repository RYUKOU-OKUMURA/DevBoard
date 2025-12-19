/**
 * RepoList - List/table view for repositories
 * Displays repositories in a sortable table format
 */

import React, { useState, useMemo } from 'react';
import { Repo } from '../types';
import { timeAgo } from '../lib/timeAgo';
import { focusRing } from '../lib/focusRing';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useTagsContext } from '../contexts/TagsContext';
import { TagBadge } from './TagBadge';

interface RepoListProps {
  repos: Repo[];
  isLoading?: boolean;
}

type SortColumn = 'name' | 'language' | 'stars' | 'updated' | 'visibility';
type SortDirection = 'asc' | 'desc';

export const RepoList: React.FC<RepoListProps> = ({
  repos,
  isLoading = false,
}) => {
  const { selectRepo } = useWorkspace();
  const { getTagObjectsForRepo } = useTagsContext();
  const [sortColumn, setSortColumn] = useState<SortColumn>('updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.nameWithOwner.localeCompare(b.nameWithOwner);
          break;
        case 'language':
          comparison = (a.primaryLanguage || '').localeCompare(b.primaryLanguage || '');
          break;
        case 'stars':
          comparison = (a.stargazers_count || 0) - (b.stargazers_count || 0);
          break;
        case 'updated':
          comparison = new Date(a.pushedAt).getTime() - new Date(b.pushedAt).getTime();
          break;
        case 'visibility':
          comparison = (a.isPrivate ? 1 : 0) - (b.isPrivate ? 1 : 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [repos, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-14 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] animate-pulse"
            />
          ))}
        </div>
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

  const SortHeader = ({
    column,
    children,
    width,
  }: {
    column: SortColumn;
    children: React.ReactNode;
    width?: string;
  }) => (
    <th
      className={`
        px-4 py-3 text-left text-caption font-semibold text-[var(--text-secondary)]
        cursor-pointer select-none
        hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]
        transition-colors
      `}
      style={{ width }}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <svg
            className={`w-3 h-3 transition-transform ${sortDirection === 'asc' ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </th>
  );

  return (
    <div className="overflow-auto h-full">
      <table className="w-full min-w-[800px]">
        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] sticky top-0 z-10">
          <tr>
            <SortHeader column="name" width="30%">リポジトリ</SortHeader>
            <th className="px-4 py-3 text-left text-caption font-semibold text-[var(--text-secondary)]" style={{ width: '15%' }}>
              タグ
            </th>
            <SortHeader column="language" width="12%">言語</SortHeader>
            <SortHeader column="stars" width="10%">スター</SortHeader>
            <SortHeader column="visibility" width="10%">公開</SortHeader>
            <SortHeader column="updated" width="15%">最終更新</SortHeader>
            <th className="px-4 py-3 text-right text-caption font-semibold text-[var(--text-secondary)]" style={{ width: '8%' }}>
              アクション
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {sortedRepos.map((repo) => (
            <ListRow
              key={repo.id}
              repo={repo}
              tags={getTagObjectsForRepo(repo.id)}
              onSelect={() => selectRepo(repo)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ListRowProps {
  repo: Repo;
  tags: Array<{ id: string; name: string; color: string }>;
  onSelect: () => void;
}

const ListRow: React.FC<ListRowProps> = ({
  repo,
  tags,
  onSelect,
}) => {
  const [owner, repoName] = repo.nameWithOwner.split('/');

  return (
    <tr
      className={`
        group
        bg-[var(--bg-primary)]
        hover:bg-[var(--bg-hover)]
        transition-colors
        cursor-pointer
      `}
      onClick={onSelect}
    >
      {/* Repository Name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-medium text-[var(--text-primary)] truncate">
                {repoName}
              </span>
              {repo.isArchived && (
                <span className="px-1.5 py-0.5 text-[10px] bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded">
                  Archived
                </span>
              )}
            </div>
            <span className="text-caption text-[var(--text-muted)]">{owner}</span>
          </div>
        </div>
      </td>

      {/* Tags */}
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag) => (
            <TagBadge key={tag.id} tag={tag} size="sm" />
          ))}
          {tags.length > 2 && (
            <span className="text-caption text-[var(--text-muted)]">+{tags.length - 2}</span>
          )}
        </div>
      </td>

      {/* Language */}
      <td className="px-4 py-3">
        {repo.primaryLanguage && (
          <span className="flex items-center gap-1.5 text-body-sm text-[var(--text-secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-blue)]" />
            {repo.primaryLanguage}
          </span>
        )}
      </td>

      {/* Stars */}
      <td className="px-4 py-3">
        {typeof repo.stargazers_count === 'number' && (
          <span className="flex items-center gap-1 text-body-sm text-[var(--text-secondary)]">
            <svg className="w-4 h-4 text-[var(--accent-yellow)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3.5 14.45 9h5.55l-4.5 3.3 1.7 5.2L12 14.7 6.8 17.5 8.5 12.3 4 9h5.55z" />
            </svg>
            {repo.stargazers_count.toLocaleString()}
          </span>
        )}
      </td>

      {/* Visibility */}
      <td className="px-4 py-3">
        {repo.isPrivate ? (
          <span className="px-2 py-0.5 text-caption bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)] rounded border border-[var(--accent-yellow-border)]">
            Private
          </span>
        ) : (
          <span className="px-2 py-0.5 text-caption bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] rounded border border-[var(--accent-green-border)]">
            Public
          </span>
        )}
      </td>

      {/* Last Updated */}
      <td className="px-4 py-3">
        <span className="text-body-sm text-[var(--text-secondary)]">
          {timeAgo(repo.pushedAt)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`
              p-1.5 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-tertiary)]
              transition-colors
              ${focusRing.default}
            `}
            title="GitHubで開く"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`
              p-1.5 rounded-lg
              text-[var(--accent-green)] hover:text-white
              hover:bg-[var(--accent-green)]
              transition-colors
              ${focusRing.default}
            `}
            title="ワークスペースを開く"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
};

export default RepoList;
