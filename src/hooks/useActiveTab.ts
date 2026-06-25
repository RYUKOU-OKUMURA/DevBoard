import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TabType } from '../components/TabNavigation';
import { getStorageString, setStorageString } from '../utils/storage';

type LegacyTabType = 'updates' | 'todos';

const TAB_STORAGE_KEY = 'activeTab';
export const DEFAULT_TAB: TabType = 'board';
const VALID_TABS: TabType[] = ['board', 'practice', 'advanced', 'activity', 'manual'];
const LEGACY_TABS: LegacyTabType[] = ['updates', 'todos'];
const LEGACY_TAB_MAP: Record<LegacyTabType, TabType> = {
  updates: 'advanced',
  todos: 'advanced',
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

export function resolveTabCandidate(candidate: string): {
  tab: TabType;
  pendingLegacy: LegacyTabType | null;
} {
  if (isValidTab(candidate)) {
    return { tab: candidate, pendingLegacy: null };
  }

  if (isLegacyTab(candidate)) {
    return { tab: LEGACY_TAB_MAP[candidate], pendingLegacy: candidate };
  }

  return { tab: DEFAULT_TAB, pendingLegacy: null };
}

function buildInitialState() {
  const saved = getStorageString(TAB_STORAGE_KEY, DEFAULT_TAB);
  const urlTab = readUrlTab();
  const candidate = (urlTab ?? saved) as string;

  return resolveTabCandidate(candidate);
}

function pushTabToHistory(tab: TabType) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const current = params.get('tab');
  if (current === tab) return;
  params.set('tab', tab);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  // タブ切り替えは履歴に積むことでブラウザの戻る/進むを効かせる
  window.history.pushState({ tab }, '', newUrl);
}

function replaceTabInHistory(tab: TabType) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const current = params.get('tab');
  if (!current) return;
  if (current === tab) return;
  params.set('tab', tab);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  // 初期ロード時の旧値/不正値の上書きは履歴を汚さないreplaceで行う
  window.history.replaceState({ tab }, '', newUrl);
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

  // URLクエリの旧値/不正値は新しいtabで上書きする（履歴は汚さない）
  useEffect(() => {
    if (needsMigration) return;
    replaceTabInHistory(activeTab);
  }, [activeTab, needsMigration]);

  // ブラウザの戻る/進むでタブを復元する
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = (event: PopStateEvent) => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      if (!urlTab) {
        // URLからtabが消えたら既定へ戻す
        setActiveTab((prev) => (prev === DEFAULT_TAB ? prev : DEFAULT_TAB));
        return;
      }
      const { tab, pendingLegacy } = resolveTabCandidate(urlTab);
      setPendingLegacyTab(pendingLegacy);
      setNeedsMigration(pendingLegacy !== null);
      setActiveTab((prev) => (prev === tab ? prev : tab));
      // popstate時はstateがすでにURLへ反映済みなのでpush/replaceしない
      void event;
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleTabChange = useCallback(
    (tab: TabType) => {
      if (tab === activeTab) {
        return;
      }
      setNeedsMigration(false);
      setPendingLegacyTab(null);
      setActiveTab(tab);
      // ユーザー操作によるタブ切り替えは履歴に積む
      pushTabToHistory(tab);
    },
    [activeTab]
  );

  const resolveMigration = useCallback(
    (tab: TabType) => {
      setNeedsMigration(false);
      setPendingLegacyTab(null);
      setActiveTab(tab);
      pushTabToHistory(tab);
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
