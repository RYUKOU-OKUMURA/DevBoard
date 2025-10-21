import type { Repo, SortOrder } from "../types";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function buildSearchIndex(repo: Repo): string {
  const fields: string[] = [repo.nameWithOwner];

  if (repo.primaryLanguage) {
    fields.push(repo.primaryLanguage);
  }

  if (repo.description) {
    fields.push(repo.description);
  }

  if (repo.topics.length > 0) {
    fields.push(repo.topics.join(" "));
  }

  return normalize(fields.join(" \n"));
}

function compareByLastUpdated(a: Repo, b: Repo): number {
  const aTime = new Date(a.pushedAt).getTime();
  const bTime = new Date(b.pushedAt).getTime();

  if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) {
    return 0;
  }
  if (!Number.isFinite(aTime)) {
    return 1;
  }
  if (!Number.isFinite(bTime)) {
    return -1;
  }

  if (aTime === bTime) {
    return a.nameWithOwner.localeCompare(b.nameWithOwner, undefined, {
      sensitivity: "base",
    });
  }

  return bTime - aTime;
}

function compareByName(a: Repo, b: Repo): number {
  return a.nameWithOwner.localeCompare(b.nameWithOwner, undefined, {
    sensitivity: "base",
  });
}

/**
 * 指定した検索クエリでリポジトリをフィルタする。
 */
export function filterRepositories(repos: Repo[], query: string): Repo[] {
  const normalizedQuery = normalize(query);
  if (normalizedQuery === "") {
    return [...repos];
  }

  return repos.filter((repo) => buildSearchIndex(repo).includes(normalizedQuery));
}

/**
 * 指定したソート順でリポジトリを並べ替える。
 */
export function sortRepositories(repos: Repo[], sortOrder: SortOrder): Repo[] {
  const cloned = [...repos];
  if (sortOrder === "name") {
    return cloned.sort(compareByName);
  }
  return cloned.sort(compareByLastUpdated);
}

/**
 * 検索とソートをまとめて適用するヘルパー。
 */
export function filterAndSortRepositories(
  repos: Repo[],
  query: string,
  sortOrder: SortOrder
): Repo[] {
  return sortRepositories(filterRepositories(repos, query), sortOrder);
}
