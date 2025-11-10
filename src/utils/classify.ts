import { Repo, ColumnKey, AppConfig } from '../types';
import { differenceInDays } from './date';
import { classifyRepo as classifyRepoCore, DEFAULT_CLASSIFY_CONFIG, configToOptions } from '../lib/classifyRepo';

/**
 * アダプタ層: UIコード用の分類ユーティリティ
 * 
 * 実装の真実の源は `src/lib/classifyRepo.ts`（純粋なドメインロジック）。
 * このモジュールは以前のAPI表面を維持するためのアダプタです。
 * 新しいコードでは `src/lib/classifyRepo` を直接インポートすることを推奨します。
 */
export const DEFAULT_CONFIG: AppConfig = DEFAULT_CLASSIFY_CONFIG;

/**
 * 指定された日付からの経過日数を計算（切り上げ、未来日付は0にクランプ）
 */
export function daysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diff = differenceInDays(now, date, { clampToZero: true });
  return Math.ceil(Math.abs(diff));
}

/**
 * コア分類ロジックへのアダプタ（utils API表面を維持）
 */
export function classifyRepo(
  repo: Repo,
  config: AppConfig = DEFAULT_CONFIG
): ColumnKey {
  return classifyRepoCore(repo, configToOptions(config));
}

/**
 * 複数のリポジトリを列に分類
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
