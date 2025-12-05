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
    async function load() {
      setIsLoading(true);
      try {
        const [issues, pullRequests] = await Promise.all([
          fetchLatestIssues({ signal: controller.signal }),
          fetchLatestPullRequests({ signal: controller.signal }),
        ]);
        const combined = [...issues, ...pullRequests];
        if (!cancelled) {
          setRecentItems(combined);
        }
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) {
          return;
        }
        console.error('Failed to fetch latest items:', err);
        if (!cancelled) {
          setRecentItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
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

