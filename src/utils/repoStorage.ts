import type { Repo } from "../types";
import { getStorageString, removeStorageItem } from './storage';
import { devError, devWarn } from './logger';

// ストレージキー（accountId 付き）
const VIEWER_REPOS_KEY = "devboard_viewer_repos";
const CUSTOM_REPOS_KEY = "devboard_custom_repos";
const VIEWER_REPOS_PREFIX = `${VIEWER_REPOS_KEY}:`;
const CUSTOM_REPOS_PREFIX = `${CUSTOM_REPOS_KEY}:`;

// 旧キー（アカウント非分離）
const LEGACY_VIEWER_REPOS_KEY = VIEWER_REPOS_KEY;
const LEGACY_CUSTOM_REPOS_KEY = CUSTOM_REPOS_KEY;

export const REPO_CACHE_TTL_MS = 2 * 60 * 1000; // 2分

type RepoSourceType = "viewer" | "manual";

export type StoredRepoData = {
  version?: number;
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
  try {
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
  } catch {
    return null;
  }
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

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access repository cache.');
  }
  return accountId;
}

function getViewerRepoKey(accountId: string): string {
  return `${VIEWER_REPOS_PREFIX}${assertAccountId(accountId)}`;
}

function getCustomRepoKey(accountId: string): string {
  return `${CUSTOM_REPOS_PREFIX}${assertAccountId(accountId)}`;
}

function migrateLegacyRepoCache(accountId: string, type: RepoSourceType): Repo[] | null {
  const legacyKey = type === "viewer" ? LEGACY_VIEWER_REPOS_KEY : LEGACY_CUSTOM_REPOS_KEY;
  const targetKey = type === "viewer" ? getViewerRepoKey(accountId) : getCustomRepoKey(accountId);

  // 旧キーが存在しない場合は何もしない
  const legacyRaw = getStorageString(legacyKey, "");
  if (!legacyRaw) {
    return null;
  }

  // 既に新キーが存在する場合は旧キーをクリーンアップのみ
  const targetRaw = getStorageString(targetKey, "");
  if (targetRaw) {
    removeStorageItem(legacyKey);
    return null;
  }

  // 旧データを読み込んでから新キーに保存（読み込み時に壊れたデータは捨てる）
  const migrated = loadReposFromStorageInternal(legacyKey, type);
  if (migrated) {
    saveReposToStorage(targetKey, migrated, type);
  }

  // 旧キーは必ず削除
  removeStorageItem(legacyKey);
  return migrated;
}

function loadReposFromStorageInternal(key: string, type: RepoSourceType): Repo[] | null {
  try {
    const stored = getStorageString(key, '');
    if (!stored) {
      return null;
    }

    let parsed: ParsedStoredRepoData | null = null;

    try {
      parsed = parseStoredRepoData(stored);
    } catch (parseError) {
      devError(`Failed to parse repo cache for key "${key}":`, parseError);
      removeStorageItem(key);
      return null;
    }

    if (!parsed) {
      removeStorageItem(key);
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
      removeStorageItem(key);
      return null;
    }

    if (type === "viewer") {
      const age = Date.now() - timestamp;

      if (!Number.isFinite(age) || age > REPO_CACHE_TTL_MS) {
        removeStorageItem(key);
        return null;
      }
    }

    if (type === "manual" && needsNormalization) {
      // 正規化されたソース情報で保存し直す
      saveReposToStorage(key, reposWithSource, type);
    }

    return reposWithSource;
  } catch (error) {
    devError("Failed to load repos from localStorage:", error);
    return null;
  }
}

function saveReposToStorage(key: string, repos: Repo[], type: RepoSourceType): void {
  const payload: StoredRepoData = {
    version: 1,
    repos: attachSource(repos, type),
    timestamp: Date.now(),
  };

  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(payload));
    }
  } catch (error) {
    devError(`Failed to save ${type} repos to localStorage:`, error);
  }
}

function getRepoTimestamp(key: string): number | null {
  try {
    const stored = getStorageString(key, '');
    if (!stored) {
      return null;
    }

    const parsed = parseStoredRepoData(stored);
    if (!parsed || parsed.timestamp === null || !Number.isFinite(parsed.timestamp)) {
      return null;
    }

    return parsed.timestamp;
  } catch (error) {
    devWarn("Failed to read repo timestamp from localStorage:", error);
    return null;
  }
}

/**
 * リポジトリデータをローカルストレージに保存
 */
export function saveViewerRepos(accountId: string, repos: Repo[]): void {
  const key = getViewerRepoKey(accountId);
  saveReposToStorage(key, repos, "viewer");
}

/**
 * viewerリポジトリをローカルストレージから取得
 * 有効期限（2分）を過ぎている場合はnullを返す
 */
export function loadViewerRepos(accountId: string): Repo[] | null {
  const key = getViewerRepoKey(accountId);
  const migrated = migrateLegacyRepoCache(accountId, "viewer");
  if (migrated) {
    return migrated;
  }
  return loadReposFromStorageInternal(key, "viewer");
}

/**
 * カスタムリポジトリをローカルストレージに保存
 */
export function saveCustomRepos(accountId: string, repos: Repo[]): void {
  const key = getCustomRepoKey(accountId);
  saveReposToStorage(key, repos, "manual");
}

/**
 * カスタムリポジトリをローカルストレージから取得
 * viewerキャッシュとは異なり有効期限は設けない
 */
export function loadCustomRepos(accountId: string): Repo[] | null {
  const key = getCustomRepoKey(accountId);
  const migrated = migrateLegacyRepoCache(accountId, "manual");
  if (migrated) {
    return migrated;
  }
  return loadReposFromStorageInternal(key, "manual");
}

/**
 * viewerリポジトリのタイムスタンプを取得
 */
export function getViewerReposTimestamp(accountId: string): number | null {
  const key = getViewerRepoKey(accountId);
  // タイムスタンプ取得前に旧データがあれば移行
  migrateLegacyRepoCache(accountId, "viewer");
  return getRepoTimestamp(key);
}

/**
 * カスタムリポジトリのタイムスタンプを取得
 */
export function getCustomReposTimestamp(accountId: string): number | null {
  const key = getCustomRepoKey(accountId);
  migrateLegacyRepoCache(accountId, "manual");
  return getRepoTimestamp(key);
}

/**
 * すべてのリポジトリキャッシュをクリア
 */
export function clearRepoCache(accountId: string): void {
  const viewerKey = getViewerRepoKey(accountId);
  const customKey = getCustomRepoKey(accountId);
  removeStorageItem(viewerKey);
  removeStorageItem(customKey);
  // 念のため旧キーも削除
  removeStorageItem(LEGACY_VIEWER_REPOS_KEY);
  removeStorageItem(LEGACY_CUSTOM_REPOS_KEY);
}
