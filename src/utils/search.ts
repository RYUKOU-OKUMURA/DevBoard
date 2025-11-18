import { Repo, SortOrder } from '../types';
import type { Tag } from '../types/tag';

/**
 * Normalize a string for case-insensitive comparison
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

/**
 * Check if a repository matches a search query
 * Searches across: nameWithOwner, primaryLanguage, description, topics, tags
 */
export function matchesSearch(
  repo: Repo,
  query: string,
  repoTags?: Tag[]
): boolean {
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

  // Search in tags
  if (repoTags && repoTags.length > 0) {
    if (repoTags.some(tag => normalizeString(tag.name).includes(normalizedQuery))) {
      return true;
    }
  }

  return false;
}

/**
 * Filter repositories based on search query
 */
export function filterRepos(
  repos: Repo[],
  query: string,
  getRepoTags?: (repoId: string) => Tag[]
): Repo[] {
  if (!query || query.trim() === '') {
    return repos;
  }

  return repos.filter(repo => {
    const repoTags = getRepoTags ? getRepoTags(repo.id) : undefined;
    return matchesSearch(repo, query, repoTags);
  });
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

    case 'stars':
      // Sort by stargazers_count descending (most stars first)
      sorted.sort((a, b) => {
        const starsA = a.stargazers_count ?? 0;
        const starsB = b.stargazers_count ?? 0;
        return starsB - starsA;
      });
      break;

    case 'language':
      // Sort by primaryLanguage ascending (alphabetical)
      // Repos without language come last
      sorted.sort((a, b) => {
        const langA = a.primaryLanguage ?? '';
        const langB = b.primaryLanguage ?? '';

        if (langA === '' && langB === '') return 0;
        if (langA === '') return 1;
        if (langB === '') return -1;

        return langA.localeCompare(langB);
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
  sortOrder: SortOrder,
  getRepoTags?: (repoId: string) => Tag[]
): Repo[] {
  const filtered = filterRepos(repos, query, getRepoTags);
  return sortRepos(filtered, sortOrder);
}
