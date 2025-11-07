import { Repo } from '../types';

const MANUAL_REPOS_STORAGE_KEY = 'github-dashboard-manual-repos';

/**
 * 手動追加リポジトリをlocalStorageから取得
 */
export function getManualRepos(): Repo[] {
  try {
    const data = localStorage.getItem(MANUAL_REPOS_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const repos = JSON.parse(data);
    return Array.isArray(repos) ? repos : [];
  } catch (error) {
    console.error('手動追加リポジトリの取得に失敗しました:', error);
    return [];
  }
}

/**
 * 手動追加リポジトリをlocalStorageに保存
 */
export function saveManualRepos(repos: Repo[]): boolean {
  try {
    localStorage.setItem(MANUAL_REPOS_STORAGE_KEY, JSON.stringify(repos));
    return true;
  } catch (error) {
    console.error('手動追加リポジトリの保存に失敗しました:', error);
    return false;
  }
}

/**
 * 手動追加リポジトリを追加
 */
export function addManualRepo(repo: Repo): boolean {
  try {
    const repos = getManualRepos();
    
    // 既に存在するリポジトリかチェック
    if (repos.some((r) => r.id === repo.id)) {
      console.warn(`リポジトリ ${repo.id} は既に存在します`);
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
    return saveManualRepos(repos);
  } catch (error) {
    console.error('手動追加リポジトリの追加に失敗しました:', error);
    return false;
  }
}

/**
 * 複数の手動追加リポジトリを追加
 */
export function addMultipleManualRepos(newRepos: Repo[]): boolean {
  try {
    const repos = getManualRepos();
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
    return saveManualRepos(updatedRepos);
  } catch (error) {
    console.error('複数のリポジトリ追加に失敗しました:', error);
    return false;
  }
}

/**
 * 指定したIDのリポジトリを削除
 */
export function removeManualRepos(ids: string[]): boolean {
  try {
    const repos = getManualRepos();
    const idSet = new Set(ids);
    const filteredRepos = repos.filter((repo) => !idSet.has(repo.id));

    return saveManualRepos(filteredRepos);
  } catch (error) {
    console.error('手動追加リポジトリの削除に失敗しました:', error);
    return false;
  }
}

/**
 * すべての手動追加リポジトリを削除
 */
export function clearManualRepos(): boolean {
  try {
    localStorage.removeItem(MANUAL_REPOS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('手動追加リポジトリのクリアに失敗しました:', error);
    return false;
  }
}

/**
 * 指定したIDのリポジトリを取得
 */
export function getManualRepoById(id: string): Repo | null {
  const repos = getManualRepos();
  return repos.find((repo) => repo.id === id) || null;
}

/**
 * 手動追加リポジトリの数を取得
 */
export function getManualRepoCount(): number {
  return getManualRepos().length;
}

/**
 * リポジトリが手動追加かどうかを判定
 */
export function isManuallyAdded(repo: Repo): boolean {
  return repo.source?.type === 'manual';
}

