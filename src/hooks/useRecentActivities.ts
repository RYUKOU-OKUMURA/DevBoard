import { useState, useEffect } from 'react';
import { RecentItem } from '../types';
import { fetchLatestIssues, fetchLatestPullRequests } from '../api/repos';
import { isAbortError } from '../utils/errorHandling';

interface UseRecentActivitiesOptions {
  enabled?: boolean;
  refreshToken?: number;
}

interface UseRecentActivitiesReturn {
  recentItems: RecentItem[];
  isLoading: boolean;
}

type CacheEntry = {
  data: RecentItem[];
  fetchedAt: number;
  refreshToken: number;
  promise?: Promise<RecentItem[]>;
};

const RECENT_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1分キャッシュして重複リクエストを防ぐ

/**
 * 最近のアクティビティ（Issues/PRs）を読み込むカスタムフック
 */
export function useRecentActivities(
  user: { userId?: string } | null,
  options: UseRecentActivitiesOptions = {}
): UseRecentActivitiesReturn {
  const { enabled = true, refreshToken = 0 } = options;
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !user) {
      setRecentItems([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const cacheKey = user.userId || 'anonymous';

    const useCacheIfFresh = () => {
      const cached = RECENT_CACHE.get(cacheKey);
      if (!cached) return false;
      const isFresh =
        cached.refreshToken === refreshToken && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
      if (isFresh) {
        setRecentItems(cached.data);
        setIsLoading(false);
        return true;
      }
      return false;
    };

    async function load() {
      // すでに最新データがあれば即返す
      if (useCacheIfFresh()) return;

      setIsLoading(true);
      try {
        const cached = RECENT_CACHE.get(cacheKey);
        // 他のコンポーネントが同時取得中ならその結果を待つ
        if (cached?.promise && cached.refreshToken === refreshToken) {
          const combined = await cached.promise;
          if (!cancelled) setRecentItems(combined);
          return;
        }

        const fetchPromise = (async () => {
          const [issues, pullRequests] = await Promise.all([
            fetchLatestIssues({ signal: controller.signal }),
            fetchLatestPullRequests({ signal: controller.signal }),
          ]);
          const combined = [...issues, ...pullRequests];
          RECENT_CACHE.set(cacheKey, {
            data: combined,
            fetchedAt: Date.now(),
            refreshToken,
          });
          return combined;
        })();

        RECENT_CACHE.set(cacheKey, {
          data: cached?.data ?? [],
          fetchedAt: cached?.fetchedAt ?? 0,
          refreshToken,
          promise: fetchPromise,
        });

        const combined = await fetchPromise;
        if (!cancelled) setRecentItems(combined);
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        console.error('Failed to fetch latest items:', err);
        if (!cancelled) {
          setRecentItems([]);
        }
        // 失敗した場合はキャッシュをクリアして次回再試行
        RECENT_CACHE.delete(cacheKey);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
        const cached = RECENT_CACHE.get(cacheKey);
        if (cached?.promise) {
          RECENT_CACHE.set(cacheKey, { ...cached, promise: undefined });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user, enabled, refreshToken]);

  return {
    recentItems,
    isLoading,
  };
}

