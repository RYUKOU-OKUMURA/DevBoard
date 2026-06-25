import { useCallback, useEffect, useState } from 'react';
import type { TabType } from '../components/TabNavigation';
import type { AdvancedSubTab } from '../types';
import { DEFAULT_ADVANCED_SUB_TAB, isAdvancedSubTab } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { DEFAULT_TAB, resolveTabCandidate } from './useActiveTab';

const STORAGE_PREFIX = 'advanced-sub-tab:';

export function getSubStorageKey(accountId: string): string {
  return `${STORAGE_PREFIX}${accountId}`;
}

function readUrlSub(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('sub');
}

function readUrlTab(): TabType {
  if (typeof window === 'undefined') return DEFAULT_TAB;
  const params = new URLSearchParams(window.location.search);
  return resolveTabCandidate(params.get('tab') ?? DEFAULT_TAB).tab;
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
  // advanced系（advanced/activity/manual）以外はURL/ストレージを参照せず既定を返す
  if (activeTab !== 'advanced' && activeTab !== 'activity' && activeTab !== 'manual') {
    return DEFAULT_ADVANCED_SUB_TAB;
  }
  const urlSub = readUrlSub();
  if (urlSub && isAdvancedSubTab(urlSub)) return urlSub;
  // 旧 tab=activity/manual の場合は sub もそれに合わせる
  if (activeTab === 'activity') return 'activity';
  if (activeTab === 'manual') return 'manual';
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

  // activeTab が advanced 系に切り替わったら URL/ストレージから sub を復元、
  // advanced 系以外に離脱したら既定へ戻す（古い sub が残らないように）
  useEffect(() => {
    if (activeTab === 'advanced' || activeTab === 'activity' || activeTab === 'manual') {
      const next = resolveInitialSubTab(activeTab, accountId);
      setSubTabState((prev) => (prev === next ? prev : next));
    } else {
      setSubTabState((prev) => (prev === DEFAULT_ADVANCED_SUB_TAB ? prev : DEFAULT_ADVANCED_SUB_TAB));
    }
  }, [activeTab, accountId]);

  // サブタブ変更時にストレージへ保存（アカウント単位、advanced系のときのみ）
  useEffect(() => {
    if (activeTab !== 'advanced' && activeTab !== 'activity' && activeTab !== 'manual') return;
    setStorageItem(getSubStorageKey(accountId), subTab);
  }, [subTab, activeTab, accountId]);

  // URLのsubを同期（advanced系のときのみ）
  useEffect(() => {
    if (activeTab !== 'advanced' && activeTab !== 'activity' && activeTab !== 'manual') return;
    replaceSubInHistory(subTab);
  }, [subTab, activeTab]);

  // ブラウザ戻る/進むでsubを復元。stateではなくURLのtabを正とする（stale closure回避）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const urlTab = readUrlTab();
      if (urlTab !== 'advanced' && urlTab !== 'activity' && urlTab !== 'manual') return;
      const params = new URLSearchParams(window.location.search);
      const urlSub = params.get('sub');
      if (!urlSub) {
        // sub が URL に無ければ activeTab から推論
        const fallback = urlTab === 'activity' ? 'activity' : urlTab === 'manual' ? 'manual' : DEFAULT_ADVANCED_SUB_TAB;
        setSubTabState((prev) => (prev === fallback ? prev : fallback));
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
  }, []);

  const setSubTab = useCallback(
    (sub: AdvancedSubTab) => {
      setSubTabState((prev) => (prev === sub ? prev : sub));
      if (activeTab === 'advanced' || activeTab === 'activity' || activeTab === 'manual') {
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
