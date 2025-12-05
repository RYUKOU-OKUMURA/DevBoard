import { Repo } from '../types';
import { getStorageItem, setStorageItem, removeStorageItem, getStorageString } from './storage';
import { devError, devWarn } from './logger';

const LEGACY_MANUAL_REPOS_STORAGE_KEY = 'github-dashboard-manual-repos';
const MANUAL_REPOS_STORAGE_PREFIX = 'manual-repos:';
const MANUAL_REPOS_VERSION = 1;

type ManualRepoEnvelope = {
  version: number;
  repos: Repo[];
};

function assertAccountId(accountId: string): string {
  if (!accountId || accountId.trim().length === 0) {
    throw new Error('accountId is required to access manual repositories.');
  }
  return accountId;
}

function getManualRepoKey(accountId: string): string {
  return `${MANUAL_REPOS_STORAGE_PREFIX}${assertAccountId(accountId)}`;
}

function parseManualRepoEnvelope(value: unknown): Repo[] | null {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object' && 'repos' in (value as Record<string, unknown>)) {
    const envelope = value as ManualRepoEnvelope;
    if (Array.isArray(envelope.repos)) {
      return envelope.repos;
    }
  }
  return null;
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
    saveManualRepos(accountId, legacyRepos);
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
  const stored = getStorageItem<ManualRepoEnvelope | Repo[]>(key, []);
  const parsed = parseManualRepoEnvelope(stored);
  if (parsed === null) {
    removeStorageItem(key);
    return [];
  }
  return parsed;
}

/**
 * 手動追加リポジトリをlocalStorageに保存
 */
export function saveManualRepos(accountId: string, repos: Repo[]): boolean {
  const key = getManualRepoKey(accountId);
  const payload: ManualRepoEnvelope = {
    version: MANUAL_REPOS_VERSION,
    repos,
  };
  return setStorageItem(key, payload);
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

