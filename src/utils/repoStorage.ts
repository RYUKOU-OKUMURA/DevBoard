import type { Repo } from "../types";

// ストレージキー
const VIEWER_REPOS_KEY = "devboard_viewer_repos";
const CUSTOM_REPOS_KEY = "devboard_custom_repos";

export const REPO_CACHE_TTL_MS = 2 * 60 * 1000; // 2分

type RepoSourceType = "viewer" | "manual";

export type StoredRepoData = {
  repos: Repo[];
  timestamp: number;
};

type ParsedStoredRepoData = {
  repos: Repo[];
  timestamp: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeRepo(rawRepo: unknown): Repo | null {
  if (!isRecord(rawRepo)) {
    return null;
  }

  const {
    id,
    nameWithOwner,
    htmlUrl,
    pushedAt,
    isArchived,
    isPrivate,
    description,
    primaryLanguage,
    topics,
    stargazers_count,
    source,
  } = rawRepo;

  if (
    typeof id !== "string" ||
    typeof nameWithOwner !== "string" ||
    typeof htmlUrl !== "string" ||
    typeof pushedAt !== "string"
  ) {
    return null;
  }

  const sanitizedTopics = Array.isArray(topics)
    ? topics.filter((topic): topic is string => typeof topic === "string")
    : [];

  const repo: Repo = {
    id,
    nameWithOwner,
    htmlUrl,
    pushedAt,
    isArchived: Boolean(isArchived),
    isPrivate: Boolean(isPrivate),
    topics: sanitizedTopics,
  };

  if (typeof description === "string") {
    repo.description = description;
  }

  if (typeof primaryLanguage === "string") {
    repo.primaryLanguage = primaryLanguage;
  }

  if (typeof stargazers_count === "number" && Number.isFinite(stargazers_count)) {
    repo.stargazers_count = stargazers_count;
  }

  if (isRecord(source) && typeof source.type === "string") {
    if (source.type === "manual") {
      repo.source = {
        type: "manual",
        addedAt: typeof source.addedAt === "string" ? source.addedAt : undefined,
      };
    } else if (source.type === "viewer") {
      repo.source = { type: "viewer" };
    }
  }

  return repo;
}

function sanitizeRepos(raw: unknown): Repo[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const sanitized: Repo[] = [];

  for (const entry of raw) {
    const repo = sanitizeRepo(entry);
    if (repo) {
      sanitized.push(repo);
    }
  }

  return sanitized;
}

function parseStoredRepoData(raw: string): ParsedStoredRepoData | null {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    const repos = sanitizeRepos(parsed);
    if (repos === null) {
      return null;
    }
    return { repos, timestamp: null };
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const repos = sanitizeRepos(parsed.repos);
  if (repos === null) {
    return null;
  }

  const rawTimestamp = parsed.timestamp;
  let timestamp: number | null = null;

  if (typeof rawTimestamp === "number" && Number.isFinite(rawTimestamp)) {
    timestamp = rawTimestamp;
  } else if (typeof rawTimestamp === "string" && rawTimestamp.trim().length > 0) {
    const numericTimestamp = Number(rawTimestamp);
    if (Number.isFinite(numericTimestamp)) {
      timestamp = numericTimestamp;
    }
  }

  return { repos, timestamp };
}

function attachSource(repos: Repo[], type: RepoSourceType): Repo[] {
  return repos.map((repo) => {
    const currentSource = repo.source;

    if (currentSource?.type === type) {
      return { ...repo, source: currentSource };
    }

    if (type === "manual") {
      const addedAt =
        currentSource && typeof currentSource === "object" && currentSource?.type === "manual"
          ? currentSource.addedAt
          : undefined;

      return {
        ...repo,
        source: {
          type: "manual",
          addedAt: typeof addedAt === "string" ? addedAt : undefined,
        },
      };
    }

    return {
      ...repo,
      source: { type: "viewer" },
    };
  });
}

function loadReposFromStorage(key: string, type: RepoSourceType): Repo[] | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }

    let parsed: ParsedStoredRepoData | null = null;

    try {
      parsed = parseStoredRepoData(stored);
    } catch (parseError) {
      console.error(`Failed to parse repo cache for key "${key}":`, parseError);
      localStorage.removeItem(key);
      return null;
    }

    if (!parsed) {
      localStorage.removeItem(key);
      return null;
    }

    const { repos, timestamp } = parsed;
    const reposWithSource = attachSource(repos, type);
    let needsNormalization = repos.length !== reposWithSource.length;

    if (!needsNormalization) {
      needsNormalization = repos.some((repo, index) => {
        const normalized = reposWithSource[index];

        if (!normalized) {
          return true;
        }

        const originalSource = repo.source;
        const normalizedSource = normalized.source;

        if (originalSource?.type !== normalizedSource?.type) {
          return true;
        }

        if (
          originalSource?.type === "manual" &&
          normalizedSource?.type === "manual" &&
          originalSource?.addedAt !== normalizedSource?.addedAt
        ) {
          return true;
        }

        return false;
      });
    }

    if (timestamp === null || !Number.isFinite(timestamp)) {
      if (type === "manual") {
        // 旧形式のカスタムリポジトリは可能な限り保持する
        saveReposToStorage(key, reposWithSource, type);
        return reposWithSource;
      }

      // Legacy viewer data without timestamp cannot be trusted, remove it so it can be refreshed.
      localStorage.removeItem(key);
      return null;
    }

    if (type === "viewer") {
      const age = Date.now() - timestamp;

      if (!Number.isFinite(age) || age > REPO_CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }
    }

    if (type === "manual" && needsNormalization) {
      // 正規化されたソース情報で保存し直す
      saveReposToStorage(key, reposWithSource, type);
    }

    return reposWithSource;
  } catch (error) {
    console.error("Failed to load repos from localStorage:", error);
    return null;
  }
}

function saveReposToStorage(key: string, repos: Repo[], type: RepoSourceType): void {
  const payload: StoredRepoData = {
    repos: attachSource(repos, type),
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error(`Failed to save ${type} repos to localStorage:`, error);
  }
}

function getRepoTimestamp(key: string): number | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return null;
    }

    const parsed = parseStoredRepoData(stored);
    if (!parsed || parsed.timestamp === null || !Number.isFinite(parsed.timestamp)) {
      return null;
    }

    return parsed.timestamp;
  } catch (error) {
    return null;
  }
}

/**
 * リポジトリデータをローカルストレージに保存
 */
export function saveViewerRepos(repos: Repo[]): void {
  saveReposToStorage(VIEWER_REPOS_KEY, repos, "viewer");
}

/**
 * viewerリポジトリをローカルストレージから取得
 * 有効期限（2分）を過ぎている場合はnullを返す
 */
export function loadViewerRepos(): Repo[] | null {
  return loadReposFromStorage(VIEWER_REPOS_KEY, "viewer");
}

/**
 * カスタムリポジトリをローカルストレージに保存
 */
export function saveCustomRepos(repos: Repo[]): void {
  saveReposToStorage(CUSTOM_REPOS_KEY, repos, "manual");
}

/**
 * カスタムリポジトリをローカルストレージから取得
 * viewerキャッシュとは異なり有効期限は設けない
 */
export function loadCustomRepos(): Repo[] | null {
  return loadReposFromStorage(CUSTOM_REPOS_KEY, "manual");
}

/**
 * viewerリポジトリのタイムスタンプを取得
 */
export function getViewerReposTimestamp(): number | null {
  return getRepoTimestamp(VIEWER_REPOS_KEY);
}

/**
 * カスタムリポジトリのタイムスタンプを取得
 */
export function getCustomReposTimestamp(): number | null {
  return getRepoTimestamp(CUSTOM_REPOS_KEY);
}

/**
 * すべてのリポジトリキャッシュをクリア
 */
export function clearRepoCache(): void {
  try {
    localStorage.removeItem(VIEWER_REPOS_KEY);
    localStorage.removeItem(CUSTOM_REPOS_KEY);
  } catch (error) {
    console.error("Failed to clear repo cache:", error);
  }
}
