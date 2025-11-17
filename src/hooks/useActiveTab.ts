import { useCallback, useEffect, useState } from 'react';
import type { TabType } from '../components/TabNavigation';
import { getStorageString, setStorageString } from '../utils/storage';

const TAB_STORAGE_KEY = 'activeTab';
const DEFAULT_TAB: TabType = 'board';
const VALID_TABS: TabType[] = ['board', 'updates', 'manual', 'todos'];

export function useActiveTab() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = getStorageString(TAB_STORAGE_KEY, DEFAULT_TAB);
    return VALID_TABS.includes(saved as TabType) ? (saved as TabType) : DEFAULT_TAB;
  });

  useEffect(() => {
    setStorageString(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === activeTab) {
      return;
    }
    setActiveTab(tab);
  }, [activeTab]);

  return { activeTab, setActiveTab: handleTabChange };
}
