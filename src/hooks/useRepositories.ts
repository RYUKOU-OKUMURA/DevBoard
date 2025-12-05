import { useState, useCallback, useEffect } from 'react';
import { Repo } from '../types';
import { fetchUserRepos, fetchRepositoriesByUrls } from '../api/repos';
import { getViewerReposTimestamp, getCustomReposTimestamp } from '../utils/repoStorage';
import { useToast } from './useToast';
import { devError } from '../utils/logger';

type DataSource = 'viewer' | 'custom';

interface UseRepositoriesOptions {
  accountId: string;
  autoLoad?: boolean;
}

interface UseRepositoriesReturn {
  repos: Repo[];
  isLoading: boolean;
  error: string | null;
  dataSource: DataSource;
  customRepoSources: string[];
  lastUpdateTime: number | null;
  loadRepos: (forceRefresh?: boolean, options?: { notify?: boolean }) => Promise<boolean>;
  loadCustomRepos: (sources: string[], forceRefresh?: boolean, options?: { notify?: boolean }) => Promise<boolean>;
  refresh: () => Promise<void>;
  setError: (error: string | null) => void;
}

/**
 * リポジトリ読み込みロジックを管理するカスタムフック
 */
export function useRepositories(options: UseRepositoriesOptions): UseRepositoriesReturn {
  const { accountId, autoLoad = false } = options;
  if (!accountId) {
    throw new Error('accountId is required to use useRepositories.');
  }
  const { showToast } = useToast();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('viewer');
  const [customRepoSources, setCustomRepoSources] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  const loadRepos = useCallback(
    async (forceRefresh = false, options: { notify?: boolean } = {}) => {
      const { notify = false } = options;
      setIsLoading(true);
      setError(null);
      try {
        const realRepos = await fetchUserRepos(accountId, { forceRefresh });
        setRepos(realRepos);
        setDataSource('viewer');

        // Update last update time
        const timestamp = getViewerReposTimestamp(accountId);
        setLastUpdateTime(timestamp);

        if (notify) {
          showToast({
            variant: 'success',
            title: '最新のリポジトリを取得しました',
            description: `${realRepos.length} 件を表示しています`,
          });
        }

        return true;
      } catch (err) {
        devError('Failed to load repositories:', err);
        const message = err instanceof Error ? err.message : 'Failed to load repositories';
        setError(message);
        if (notify) {
          showToast({
            variant: 'error',
            title: 'リポジトリの読み込みに失敗しました',
            description: message,
          });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  const loadCustomRepos = useCallback(
    async (
      sources: string[],
      forceRefresh = false,
      options: { notify?: boolean } = {}
    ) => {
      const { notify = false } = options;
      setIsLoading(true);
      setError(null);
      try {
        const { repos: fetched, failed } = await fetchRepositoriesByUrls(accountId, sources, {
          forceRefresh,
        });
        if (fetched.length === 0) {
          const message = failed.length
            ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
            : '有効なリポジトリを入力してください。';
          setError(message);
          if (notify) {
            showToast({
              variant: 'error',
              title: 'カスタムリポジトリの読み込みに失敗しました',
              description: message,
            });
          }
          return false;
        }

        const uniqueNames = Array.from(new Set(fetched.map((repo) => repo.nameWithOwner)));
        setRepos(fetched);
        setDataSource('custom');
        setCustomRepoSources(uniqueNames);

        // Update last update time
        const timestamp = getCustomReposTimestamp(accountId);
        setLastUpdateTime(timestamp);

        if (failed.length > 0) {
          setError(`一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`);
        }

        if (notify) {
          showToast({
            variant: 'success',
            title: 'カスタムリポジトリを更新しました',
            description: `${fetched.length} 件のリポジトリを読み込みました`,
          });
        }

        return true;
      } catch (err) {
        devError('Failed to load custom repositories:', err);
        const message = err instanceof Error ? err.message : 'リポジトリの読み込みに失敗しました';
        setError(message);
        if (notify) {
          showToast({
            variant: 'error',
            title: 'カスタムリポジトリの読み込みに失敗しました',
            description: message,
          });
        }
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  const refresh = useCallback(async () => {
    if (dataSource === 'viewer') {
      await loadRepos(true, { notify: true });
    } else if (dataSource === 'custom') {
      if (customRepoSources.length > 0) {
        await loadCustomRepos(customRepoSources, true, { notify: true });
      }
    }
  }, [dataSource, customRepoSources, loadRepos, loadCustomRepos]);

  // Auto-load repos if enabled
  useEffect(() => {
    if (autoLoad && repos.length === 0 && !isLoading) {
      loadRepos();
    }
  }, [autoLoad, repos.length, isLoading, loadRepos]);

  return {
    repos,
    isLoading,
    error,
    dataSource,
    customRepoSources,
    lastUpdateTime,
    loadRepos,
    loadCustomRepos,
    refresh,
    setError,
  };
}

