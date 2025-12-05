import { Repo } from '../types';
import { getStorageItem, setStorageItem, removeStorageItem, getStorageString } from './storage';
import { devError, devWarn } from './logger';

const LEGACY_MANUAL_REPOS_STORAGE_KEY = 'github-dashboard-manual-repos';
const MANUAL_REPOS_STORAGE_PREFIX = 'manual-repos:';

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access manual repositories.');
  }
  return accountId;
}

function getManualRepoKey(accountId: string): string {
  return `${MANUAL_REPOS_STORAGE_PREFIX}${assertAccountId(accountId)}`;
}

function migrateLegacyManualRepos(accountId: string): Repo[] | null {
  // 旧キーが存在しない場合は何もしない
  const legacyRaw = getStorageString(LEGACY_MANUAL_REPOS_STORAGE_KEY, '');
  if (!legacyRaw) {
    return null;
  }

  const targetKey = getManualRepoKey(accountId);
  const targetRaw = getStorageString(targetKey, '');
  if (targetRaw) {
    removeStorageItem(LEGACY_MANUAL_REPOS_STORAGE_KEY);
    return null;
  }

  const legacyRepos = getStorageItem<Repo[]>(LEGACY_MANUAL_REPOS_STORAGE_KEY, []);
  if (legacyRepos.length > 0) {
    setStorageItem(targetKey, legacyRepos);
  }

  // 旧キーは必ず削除
  removeStorageItem(LEGACY_MANUAL_REPOS_STORAGE_KEY);
  return legacyRepos.length > 0 ? legacyRepos : [];
}

/**
 * 手動追加リポジトリをlocalStorageから取得
 */
export function getManualRepos(accountId: string): Repo[] {
  const key = getManualRepoKey(accountId);
  const migrated = migrateLegacyManualRepos(accountId);
  if (migrated) {
    return migrated;
  }
  return getStorageItem<Repo[]>(key, []);
}

/**
 * 手動追加リポジトリをlocalStorageに保存
 */
export function saveManualRepos(accountId: string, repos: Repo[]): boolean {
  const key = getManualRepoKey(accountId);
  return setStorageItem(key, repos);
}

/**
 * 手動追加リポジトリを追加
 */
export function addManualRepo(accountId: string, repo: Repo): boolean {
  assertAccountId(accountId);
  try {
    const repos = getManualRepos(accountId);
    
    // 既に存在するリポジトリかチェック
    if (repos.some((r) => r.id === repo.id)) {
      devWarn(`リポジトリ ${repo.id} は既に存在します`);
      return false;
    }

    // sourceフィールドを設定
    const newRepo: Repo = {
      ...repo,
      source: {
        type: 'manual',
        addedAt: new Date().toISOString(),
      },
    };

    repos.push(newRepo);
    return saveManualRepos(accountId, repos);
  } catch (error) {
    devError('手動追加リポジトリの追加に失敗しました:', error);
    return false;
  }
}

/**
 * 複数の手動追加リポジトリを追加
 */
export function addMultipleManualRepos(accountId: string, newRepos: Repo[]): boolean {
  assertAccountId(accountId);
  try {
    const repos = getManualRepos(accountId);
    const existingIds = new Set(repos.map((r) => r.id));

    // 既に存在しないリポジトリのみを追加
    const reposToAdd = newRepos
      .filter((repo) => !existingIds.has(repo.id))
      .map((repo) => ({
        ...repo,
        source: repo.source?.type === 'manual'
          ? repo.source
          : {
              type: 'manual' as const,
              addedAt: new Date().toISOString(),
            },
      }));

    const updatedRepos = [...repos, ...reposToAdd];
    return saveManualRepos(accountId, updatedRepos);
  } catch (error) {
    devError('複数のリポジトリ追加に失敗しました:', error);
    return false;
  }
}

/**
 * 指定したIDのリポジトリを削除
 */
export function removeManualRepos(accountId: string, ids: string[]): boolean {
  assertAccountId(accountId);
  try {
    const repos = getManualRepos(accountId);
    const idSet = new Set(ids);
    const filteredRepos = repos.filter((repo) => !idSet.has(repo.id));

    return saveManualRepos(accountId, filteredRepos);
  } catch (error) {
    devError('手動追加リポジトリの削除に失敗しました:', error);
    return false;
  }
}

/**
 * すべての手動追加リポジトリを削除
 */
export function clearManualRepos(accountId: string): boolean {
  const key = getManualRepoKey(accountId);
  removeStorageItem(LEGACY_MANUAL_REPOS_STORAGE_KEY);
  return removeStorageItem(key);
}

/**
 * 指定したIDのリポジトリを取得
 */
export function getManualRepoById(accountId: string, id: string): Repo | null {
  const repos = getManualRepos(accountId);
  return repos.find((repo) => repo.id === id) || null;
}

/**
 * 手動追加リポジトリの数を取得
 */
export function getManualRepoCount(accountId: string): number {
  return getManualRepos(accountId).length;
}

/**
 * リポジトリが手動追加かどうかを判定
 */
export function isManuallyAdded(repo: Repo): boolean {
  return repo.source?.type === 'manual';
}

