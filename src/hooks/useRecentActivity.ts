import { useCallback, useEffect, useState } from 'react';
import { fetchLatestIssues, fetchLatestPullRequests } from '../api/repos';
import type { RecentItem } from '../types';
import type { User } from '../contexts/AuthContext';

interface UseRecentActivityResult {
  recentItems: RecentItem[];
  isLoadingActivities: boolean;
  refreshRecentItems: () => void;
}

export function useRecentActivity(
  user: User | null,
  dependencyKey?: unknown
): UseRecentActivityResult {
  const activeUserId = user?.userId;
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refreshRecentItems = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activeUserId) {
        setRecentItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [issues, pullRequests] = await Promise.all([
          fetchLatestIssues(),
          fetchLatestPullRequests(),
        ]);
        if (!cancelled) {
          const combined = [...issues, ...pullRequests];
          setRecentItems(combined);
        }
      } catch (error) {
        console.error('Failed to fetch latest items:', error);
        if (!cancelled) {
          setRecentItems([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeUserId, dependencyKey, refreshToken]);

  return {
    recentItems,
    isLoadingActivities: isLoading,
    refreshRecentItems,
  };
}
