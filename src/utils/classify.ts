import { Repo, ColumnKey, AppConfig } from '../types';
import { differenceInDays } from './date';
import { classifyRepo as classifyRepoCore } from '../lib/classifyRepo';

/**
 * Default configuration for repository classification
 */
export const DEFAULT_CONFIG: AppConfig = {
  activeThreshold: 60,    // days
  staleThreshold: 180,    // days
  maxSavedViews: 5,
};

/**
 * Calculate the number of days since the given date (rounded up),
 * clamping future dates to 0.
 */
export function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diff = differenceInDays(now, date, { clampToZero: true });
  // Round up to align with historical expectations in utils tests
  return Math.ceil(Math.abs(diff));
}

/**
 * Adapter to the core classification logic to preserve the utils API surface.
 */
export function classifyRepo(
  repo: Repo,
  config: AppConfig = DEFAULT_CONFIG
): ColumnKey {
  return classifyRepoCore(repo, {
    activeThreshold: config.activeThreshold,
    staleThreshold: config.staleThreshold,
  });
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
