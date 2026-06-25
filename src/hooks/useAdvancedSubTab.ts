import { useCallback, useEffect, useState } from 'react';
import type { TabType } from '../components/TabNavigation';
import type { AdvancedSubTab } from '../types';
import { DEFAULT_ADVANCED_SUB_TAB, isAdvancedSubTab } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';

const STORAGE_PREFIX = 'advanced-sub-tab:';

export function getSubStorageKey(accountId: string): string {
  return `${STORAGE_PREFIX}${accountId}`;
}

function readUrlSub(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('sub');
}

function pushSubToHistory(sub: AdvancedSubTab) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const current = params.get('sub');
  if (current === sub) return;
  params.set('sub', sub);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.pushState({ sub }, '', newUrl);
}

function replaceSubInHistory(sub: AdvancedSubTab) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const current = params.get('sub');
  if (!current) return;
  if (current === sub) return;
  params.set('sub', sub);
  const query = params.toString();
  const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState({ sub }, '', newUrl);
}

function resolveInitialSubTab(activeTab: TabType, accountId: string): AdvancedSubTab {
  // advancedタブ以外のときはURL/ストレージを参照せず既定を返す（他タブでsubが残っていても無視）
  if (activeTab !== 'advanced') return DEFAULT_ADVANCED_SUB_TAB;
  const urlSub = readUrlSub();
  if (urlSub && isAdvancedSubTab(urlSub)) return urlSub;
  const stored = getStorageItem<unknown>(getSubStorageKey(accountId), DEFAULT_ADVANCED_SUB_TAB);
  return isAdvancedSubTab(stored) ? stored : DEFAULT_ADVANCED_SUB_TAB;
}

export interface UseAdvancedSubTabReturn {
  subTab: AdvancedSubTab;
  setSubTab: (sub: AdvancedSubTab) => void;
}

export function useAdvancedSubTab(activeTab: TabType, accountId: string): UseAdvancedSubTabReturn {
  const [subTab, setSubTabState] = useState<AdvancedSubTab>(() =>
    resolveInitialSubTab(activeTab, accountId)
  );

  // activeTabがadvanced以外に切り替わったら既定へ戻す（状態をクリアしないと古いsubが残る）
  useEffect(() => {
    if (activeTab !== 'advanced') return;
    setSubTabState((prev) => (prev === DEFAULT_ADVANCED_SUB_TAB ? prev : prev));
  }, [activeTab]);

  // サブタブ変更時にストレージへ保存（アカウント単位）
  useEffect(() => {
    if (activeTab !== 'advanced') return;
    setStorageItem(getSubStorageKey(accountId), subTab);
  }, [subTab, activeTab, accountId]);

  // URLのsubを同期（advanced時のみ。それ以外はURLにsubを残さない）
  useEffect(() => {
    if (activeTab !== 'advanced') return;
    replaceSubInHistory(subTab);
  }, [subTab, activeTab]);

  // ブラウザ戻る/進むでsubを復元
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      if (activeTab !== 'advanced') return;
      const params = new URLSearchParams(window.location.search);
      const urlSub = params.get('sub');
      if (!urlSub) {
        setSubTabState((prev) => (prev === DEFAULT_ADVANCED_SUB_TAB ? prev : DEFAULT_ADVANCED_SUB_TAB));
        return;
      }
      if (isAdvancedSubTab(urlSub)) {
        setSubTabState((prev) => (prev === urlSub ? prev : urlSub));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab]);

  const setSubTab = useCallback(
    (sub: AdvancedSubTab) => {
      setSubTabState((prev) => (prev === sub ? prev : sub));
      if (activeTab === 'advanced') {
        pushSubToHistory(sub);
      }
    },
    [activeTab]
  );

  return {
    subTab,
    setSubTab,
  };
}
