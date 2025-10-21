import { Repo, ColumnKey, AppConfig } from '../types';

/**
 * Default configuration for repository classification
 */
export const DEFAULT_CONFIG: AppConfig = {
  activeThreshold: 60,    // days
  staleThreshold: 180,    // days
  maxSavedViews: 5,
};

/**
 * Calculate the number of days between two dates
 */
export function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Classify a repository into one of the four columns based on push date
 * 
 * Classification rules:
 * - if isArchived → Archived
 * - else if daysSince(pushedAt) ≤ activeThreshold → Active
 * - else if daysSince(pushedAt) ≤ staleThreshold → Stale
 * - else → Dormant
 */
export function classifyRepo(
  repo: Repo,
  config: AppConfig = DEFAULT_CONFIG
): ColumnKey {
  // Archived repositories go to Archived column regardless of push date
  if (repo.isArchived) {
    return "Archived";
  }

  const days = daysSince(repo.pushedAt);

  if (days <= config.activeThreshold) {
    return "Active";
  } else if (days <= config.staleThreshold) {
    return "Stale";
  } else {
    return "Dormant";
  }
}

/**
 * Classify multiple repositories into columns
 */
export function classifyRepos(
  repos: Repo[],
  config: AppConfig = DEFAULT_CONFIG
): Record<ColumnKey, Repo[]> {
  const columns: Record<ColumnKey, Repo[]> = {
    Active: [],
    Stale: [],
    Dormant: [],
    Archived: [],
  };

  for (const repo of repos) {
    const column = classifyRepo(repo, config);
    columns[column].push(repo);
  }

  return columns;
}
