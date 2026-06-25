import { useCallback, useEffect, useState } from 'react';
import type { RepositoryViewMode } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';

const STORAGE_PREFIX = 'repository-progress-view:';

export function isRepositoryViewMode(value: unknown): value is RepositoryViewMode {
  return value === 'all' || value === 'kanban' || value === 'roadmap';
}

export function getRepositoryViewKey(accountId: string): string {
  return `${STORAGE_PREFIX}${accountId}`;
}

export interface UseRepositoryViewReturn {
  viewMode: RepositoryViewMode;
  setViewMode: (next: RepositoryViewMode) => void;
}

const DEFAULT_VIEW_MODE: RepositoryViewMode = 'roadmap';

export function useRepositoryView(accountId: string): UseRepositoryViewReturn {
  const [viewMode, setViewModeState] = useState<RepositoryViewMode>(() => {
    const stored = getStorageItem<unknown>(getRepositoryViewKey(accountId), DEFAULT_VIEW_MODE);
    return isRepositoryViewMode(stored) ? stored : DEFAULT_VIEW_MODE;
  });

  useEffect(() => {
    const stored = getStorageItem<unknown>(getRepositoryViewKey(accountId), DEFAULT_VIEW_MODE);
    setViewModeState(isRepositoryViewMode(stored) ? stored : DEFAULT_VIEW_MODE);
  }, [accountId]);

  const setViewMode = useCallback(
    (next: RepositoryViewMode) => {
      setViewModeState(next);
      setStorageItem(getRepositoryViewKey(accountId), next);
    },
    [accountId]
  );

  return {
    viewMode,
    setViewMode,
  };
}
