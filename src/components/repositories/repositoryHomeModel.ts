import type { ColumnKey, Repo, SortOrder } from '../../types';
import { classifyRepo, type ClassifyOptions } from '../../lib/classifyRepo';
import { searchAndSortRepos } from '../../utils/search';
import type { Tag } from '../../types/tag';

export const HIDDEN_REPOS_STORAGE_KEY = 'github-dashboard-hidden-repos';

export const REPOSITORY_HOME_COLUMN_TITLES: Record<ColumnKey, string> = {
  Active: '最近動きあり',
  Stale: '少し停滞',
  Dormant: '長く未更新',
  Archived: 'アーカイブ',
};

export function createEmptyRepositoryCounts(): Record<ColumnKey, number> {
  return {
    Active: 0,
    Stale: 0,
    Dormant: 0,
    Archived: 0,
  };
}

export function getVisibleRepositoryItems(
  repos: Repo[],
  searchQuery: string,
  sortOrder: SortOrder,
  hiddenRepoIds: Set<string>,
  getRepoTags?: (repoId: string) => Tag[]
): Repo[] {
  const visibleRepos = repos.filter((repo) => !hiddenRepoIds.has(repo.id));
  return searchAndSortRepos(visibleRepos, searchQuery, sortOrder, getRepoTags);
}

export function countRepositoryHealth(
  repos: Repo[],
  classifyOptions: ClassifyOptions
): Record<ColumnKey, number> {
  const counts = createEmptyRepositoryCounts();
  repos.forEach((repo) => {
    const column = classifyRepo(repo, classifyOptions);
    counts[column] = (counts[column] ?? 0) + 1;
  });
  return counts;
}
