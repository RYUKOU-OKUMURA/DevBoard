import type { Repo } from "../types";

// ストレージキー
const VIEWER_REPOS_KEY = "devboard_viewer_repos";
const CUSTOM_REPOS_KEY = "devboard_custom_repos";
const TTL_MS = 2 * 60 * 1000; // 2分

export type StoredRepoData = {
  repos: Repo[];
  timestamp: number;
};

/**
 * リポジトリデータをローカルストレージに保存
 */
export function saveViewerRepos(repos: Repo[]): void {
  const data: StoredRepoData = {
    repos,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(VIEWER_REPOS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save viewer repos to localStorage:", error);
  }
}

/**
 * viewerリポジトリをローカルストレージから取得
 * 有効期限（2分）を過ぎている場合はnullを返す
 */
export function loadViewerRepos(): Repo[] | null {
  try {
    const stored = localStorage.getItem(VIEWER_REPOS_KEY);
    if (!stored) return null;

    const data: StoredRepoData = JSON.parse(stored);
    const age = Date.now() - data.timestamp;

    // 2分経過していたら無効
    if (age > TTL_MS) {
      localStorage.removeItem(VIEWER_REPOS_KEY);
      return null;
    }

    return data.repos;
  } catch (error) {
    console.error("Failed to load viewer repos from localStorage:", error);
    return null;
  }
}

/**
 * カスタムリポジトリをローカルストレージに保存
 */
export function saveCustomRepos(repos: Repo[]): void {
  const data: StoredRepoData = {
    repos,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(CUSTOM_REPOS_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save custom repos to localStorage:", error);
  }
}

/**
 * カスタムリポジトリをローカルストレージから取得
 * 有効期限（2分）を過ぎている場合はnullを返す
 */
export function loadCustomRepos(): Repo[] | null {
  try {
    const stored = localStorage.getItem(CUSTOM_REPOS_KEY);
    if (!stored) return null;

    const data: StoredRepoData = JSON.parse(stored);
    const age = Date.now() - data.timestamp;

    // 2分経過していたら無効
    if (age > TTL_MS) {
      localStorage.removeItem(CUSTOM_REPOS_KEY);
      return null;
    }

    return data.repos;
  } catch (error) {
    console.error("Failed to load custom repos from localStorage:", error);
    return null;
  }
}

/**
 * viewerリポジトリのタイムスタンプを取得
 */
export function getViewerReposTimestamp(): number | null {
  try {
    const stored = localStorage.getItem(VIEWER_REPOS_KEY);
    if (!stored) return null;

    const data: StoredRepoData = JSON.parse(stored);
    return data.timestamp;
  } catch (error) {
    return null;
  }
}

/**
 * カスタムリポジトリのタイムスタンプを取得
 */
export function getCustomReposTimestamp(): number | null {
  try {
    const stored = localStorage.getItem(CUSTOM_REPOS_KEY);
    if (!stored) return null;

    const data: StoredRepoData = JSON.parse(stored);
    return data.timestamp;
  } catch (error) {
    return null;
  }
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
