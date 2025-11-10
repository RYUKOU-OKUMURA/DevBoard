import { useState, useEffect } from 'react';
import { RecentItem } from '../types';
import { fetchLatestIssues, fetchLatestPullRequests } from '../api/repos';

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
    async function load() {
      setIsLoading(true);
      try {
        const [issues, pullRequests] = await Promise.all([
          fetchLatestIssues(),
          fetchLatestPullRequests(),
        ]);
        const combined = [...issues, ...pullRequests];
        if (!cancelled) {
          setRecentItems(combined);
        }
      } catch (err) {
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
    };
  }, [user, enabled, refreshToken]);

  return {
    recentItems,
    isLoading,
  };
}

