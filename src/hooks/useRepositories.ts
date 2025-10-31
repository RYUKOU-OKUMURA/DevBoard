import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { fetchRepositoriesByUrls, fetchUserRepos } from '../api/repos';
import type { Repo } from '../types';
import type { User } from '../contexts/AuthContext';

export type DataSource = 'viewer' | 'custom';

interface UseRepositoriesResult {
  repos: Repo[];
  dataSource: DataSource;
  error: string | null;
  isLoading: boolean;
  customInput: string;
  customRepoSources: string[];
  setCustomInput: Dispatch<SetStateAction<string>>;
  submitCustomRepos: () => Promise<void>;
  refresh: () => void;
  clearError: () => void;
}

const MAX_CUSTOM_SOURCES = 25;

const parseCustomInput = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_CUSTOM_SOURCES);

export function useRepositories(activeUser: User | null): UseRepositoriesResult {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('viewer');
  const [customInput, setCustomInput] = useState('');
  const [customRepoSources, setCustomRepoSources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedInitialRepos = useRef(false);

  const loadViewerRepos = useCallback(async () => {
    if (!activeUser) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const realRepos = await fetchUserRepos();
      setRepos(realRepos);
      setDataSource('viewer');
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  }, [activeUser]);

  const loadCustomRepos = useCallback(async (sources: string[]) => {
    if (!activeUser) {
      // Allow custom repos even when user is null to support future guest mode.
      // For now simply proceed with fetch which will be proxied by backend.
    }

    setIsLoading(true);
    setError(null);
    try {
      const { repos: fetched, failed } = await fetchRepositoriesByUrls(sources);
      if (fetched.length === 0) {
        const message = failed.length
          ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
          : '有効なリポジトリを入力してください。';
        setError(message);
        return;
      }

      const uniqueNames = Array.from(new Set(fetched.map((repo) => repo.nameWithOwner)));
      setRepos(fetched);
      setDataSource('custom');
      setCustomRepoSources(uniqueNames);
      setCustomInput(uniqueNames.join('\n'));

      if (failed.length > 0) {
        setError(`一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to load custom repositories:', err);
      setError(err instanceof Error ? err.message : 'リポジトリの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [activeUser]);

  const submitCustomRepos = useCallback(async () => {
    const sources = parseCustomInput(customInput);
    if (sources.length === 0) {
      setError('リポジトリ URL または `owner/repo` を入力してください');
      return;
    }
    await loadCustomRepos(sources);
  }, [customInput, loadCustomRepos]);

  const refresh = useCallback(() => {
    if (dataSource === 'viewer') {
      void loadViewerRepos();
    } else if (customRepoSources.length > 0) {
      void loadCustomRepos(customRepoSources);
    }
  }, [dataSource, loadCustomRepos, loadViewerRepos, customRepoSources]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!activeUser) {
      setRepos([]);
      setCustomRepoSources([]);
      setCustomInput('');
      setDataSource('viewer');
      setError(null);
      hasLoadedInitialRepos.current = false;
      return;
    }

    if (!hasLoadedInitialRepos.current) {
      hasLoadedInitialRepos.current = true;
      void loadViewerRepos();
    }
  }, [activeUser, loadViewerRepos]);

  return {
    repos,
    dataSource,
    error,
    isLoading,
    customInput,
    customRepoSources,
    setCustomInput,
    submitCustomRepos,
    refresh,
    clearError,
  };
}
