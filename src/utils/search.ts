import { Repo, SortOrder } from '../types';

/**
 * Normalize a string for case-insensitive comparison
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Check if a repository matches a search query
 * Searches across: nameWithOwner, primaryLanguage, description, topics
 */
export function matchesSearch(repo: Repo, query: string): boolean {
  if (!query || query.trim() === '') {
    return true;
  }

  const normalizedQuery = normalizeString(query);

  // Search in nameWithOwner
  if (normalizeString(repo.nameWithOwner).includes(normalizedQuery)) {
    return true;
  }

  // Search in primaryLanguage
  if (repo.primaryLanguage && normalizeString(repo.primaryLanguage).includes(normalizedQuery)) {
    return true;
  }

  // Search in description
  if (repo.description && normalizeString(repo.description).includes(normalizedQuery)) {
    return true;
  }

  // Search in topics
  if (repo.topics.some(topic => normalizeString(topic).includes(normalizedQuery))) {
    return true;
  }

  return false;
}

/**
 * Filter repositories based on search query
 */
export function filterRepos(repos: Repo[], query: string): Repo[] {
  if (!query || query.trim() === '') {
    return repos;
  }

  return repos.filter(repo => matchesSearch(repo, query));
}

/**
 * Sort repositories based on sort order
 */
export function sortRepos(repos: Repo[], sortOrder: SortOrder): Repo[] {
  const sorted = [...repos];

  switch (sortOrder) {
    case 'lastUpdated':
      // Sort by pushedAt descending (most recent first)
      sorted.sort((a, b) => {
        const dateA = new Date(a.pushedAt).getTime();
        const dateB = new Date(b.pushedAt).getTime();
        return dateB - dateA;
      });
      break;

    case 'name':
      // Sort by nameWithOwner ascending (locale compare)
      sorted.sort((a, b) => {
        return a.nameWithOwner.localeCompare(b.nameWithOwner);
      });
      break;

    default:
      // Default to lastUpdated
      sorted.sort((a, b) => {
        const dateA = new Date(a.pushedAt).getTime();
        const dateB = new Date(b.pushedAt).getTime();
        return dateB - dateA;
      });
  }

  return sorted;
}

/**
 * Search and sort repositories in one operation
 */
export function searchAndSortRepos(
  repos: Repo[],
  query: string,
  sortOrder: SortOrder
): Repo[] {
  const filtered = filterRepos(repos, query);
  return sortRepos(filtered, sortOrder);
}
