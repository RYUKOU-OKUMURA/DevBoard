import { useCallback, useMemo, useState } from 'react';
import { Repo } from '../types';
import { fetchRepositoriesByUrls } from '../api/repos';
import { addMultipleManualRepos, getManualRepos, saveManualRepos } from '../utils/manualRepoStorage';
import { devError } from '../utils/logger';
import type { ToastContextValue } from '../contexts/ToastContextValue';

const MAX_MANUAL_REPOS_PER_SUBMIT = 25;

export type PreAuthView = 'landing' | 'login';

export interface ManualRepoManagerOptions {
  showToast: ToastContextValue['showToast'];
  onErrorChange?: (message: string | null) => void;
}

export function useManualRepositories({ showToast, onErrorChange }: ManualRepoManagerOptions) {
  const [manualRepos, setManualRepos] = useState<Repo[]>(() => getManualRepos());
  const [isSaving, setIsSaving] = useState(false);

  const manualRepoCount = manualRepos.length;

  const syncManualRepos = useCallback(() => {
    const repos = getManualRepos();
    setManualRepos(repos);
    return repos;
  }, []);

  const parseInput = useCallback((value: string): string[] => {
    return value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, MAX_MANUAL_REPOS_PER_SUBMIT);
  }, []);

  const addManualReposFromInput = useCallback(
    async (input: string) => {
      const sources = parseInput(input);
      if (sources.length === 0) {
        const message = 'リポジトリ URL または `owner/repo` を入力してください';
        onErrorChange?.(message);
        return { success: false, failed: sources } as const;
      }

      setIsSaving(true);
      onErrorChange?.(null);
      try {
        const { repos: fetched, failed } = await fetchRepositoriesByUrls(sources, true);
        if (fetched.length === 0) {
          const message = failed.length
            ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
            : '有効なリポジトリを入力してください。';
          onErrorChange?.(message);
          showToast({
            variant: 'error',
            title: 'リポジトリの追加に失敗しました',
            description: message,
          });
          return { success: false, failed } as const;
        }

        const reposWithSource: Repo[] = fetched.map((repo) => ({
          ...repo,
          source: {
            type: 'manual' as const,
            addedAt: new Date().toISOString(),
          },
        }));

        const saved = addMultipleManualRepos(reposWithSource);
        if (!saved) {
          const message = 'リポジトリの保存に失敗しました';
          onErrorChange?.(message);
          showToast({
            variant: 'error',
            title: 'リポジトリの追加に失敗しました',
            description: message,
          });
          return { success: false, failed } as const;
        }

        const updatedRepos = syncManualRepos();

        showToast({
          variant: 'success',
          title: 'リポジトリを保存しました',
          description: `${reposWithSource.length} 件を追加しました`,
        });

        if (failed.length > 0) {
          const message = `一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`;
          onErrorChange?.(message);
        }

        return { success: true, failed, repos: updatedRepos } as const;
      } catch (err) {
        devError('Failed to add manual repositories:', err);
        const message = err instanceof Error ? err.message : 'リポジトリの追加に失敗しました';
        onErrorChange?.(message);
        showToast({
          variant: 'error',
          title: 'リポジトリの追加に失敗しました',
          description: message,
        });
        return { success: false, failed: [] as string[] } as const;
      } finally {
        setIsSaving(false);
      }
    },
    [onErrorChange, parseInput, showToast, syncManualRepos]
  );

  const manualStats = useMemo(() => ({ count: manualRepoCount }), [manualRepoCount]);

  const setManualRepoState = useCallback(
    (next: Repo[] | ((prev: Repo[]) => Repo[])) => {
      setManualRepos((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: Repo[]) => Repo[])(prev) : next;
        saveManualRepos(resolved);
        return resolved;
      });
    },
    []
  );

  return {
    manualRepos,
    manualRepoCount,
    manualStats,
    isSaving,
    addManualReposFromInput,
    refresh: syncManualRepos,
    setManualRepos: setManualRepoState,
  };
}
