import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TabType } from '../components/TabNavigation';
import { getStorageString, setStorageString } from '../utils/storage';

type LegacyTabType = 'updates' | 'todos';

const TAB_STORAGE_KEY = 'activeTab';
const DEFAULT_TAB: TabType = 'activity';
const VALID_TABS: TabType[] = ['board', 'activity', 'manual'];
const LEGACY_TABS: LegacyTabType[] = ['updates', 'todos'];
const LEGACY_TAB_MAP: Record<LegacyTabType, TabType> = {
  updates: 'activity',
  todos: 'activity',
};

function isValidTab(value: string): value is TabType {
  return VALID_TABS.includes(value as TabType);
}

function isLegacyTab(value: string): value is LegacyTabType {
  return LEGACY_TABS.includes(value as LegacyTabType);
}

function readUrlTab(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('tab');
}

function buildInitialState() {
  const saved = getStorageString(TAB_STORAGE_KEY, DEFAULT_TAB);
  const urlTab = readUrlTab();
  const candidate = (urlTab ?? saved) as string;

  if (isValidTab(candidate)) {
    return { tab: candidate, pendingLegacy: null };
  }

  if (isLegacyTab(candidate)) {
    return { tab: LEGACY_TAB_MAP[candidate], pendingLegacy: candidate };
  }

  return { tab: DEFAULT_TAB, pendingLegacy: null };
}

export function useActiveTab() {
  const initialState = useMemo(buildInitialState, []);
  const [activeTab, setActiveTab] = useState<TabType>(initialState.tab);
  const [pendingLegacyTab, setPendingLegacyTab] = useState<LegacyTabType | null>(
    initialState.pendingLegacy
  );
  const [needsMigration, setNeedsMigration] = useState<boolean>(
    initialState.pendingLegacy !== null
  );

  useEffect(() => {
    if (needsMigration) return;
    setStorageString(TAB_STORAGE_KEY, activeTab);
  }, [activeTab, needsMigration]);

  // URLクエリの旧値/不正値は新しいtabで上書きする
  useEffect(() => {
    if (typeof window === 'undefined' || needsMigration) return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get('tab');
    if (!current) return;
    if (current === activeTab) return;
    params.set('tab', activeTab);
    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, needsMigration]);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (tab === activeTab) {
        return;
      }
      setNeedsMigration(false);
      setPendingLegacyTab(null);
      setActiveTab(tab);
    },
    [activeTab]
  );

  const resolveMigration = useCallback(
    (tab: TabType) => {
      setNeedsMigration(false);
      setPendingLegacyTab(null);
      setActiveTab(tab);
    },
    []
  );

  return {
    activeTab,
    setActiveTab: handleTabChange,
    needsMigration,
    pendingLegacyTab,
    resolveMigration,
  };
}
