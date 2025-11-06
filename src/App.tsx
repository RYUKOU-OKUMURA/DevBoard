import { useState, useEffect, useCallback } from 'react';
import { RepoBoard, TabNavigation, AddRepoModal, UpdatesTab } from './components';
import LoginPage from './components/LoginPage';
import AccountSwitcher from './components/AccountSwitcher';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ColumnKey } from './types';
import { useRepositories } from './hooks/useRepositories';
import { useRecentActivity } from './hooks/useRecentActivity';
import type { TabType } from './components/TabNavigation';

function AppContent() {
  const { user, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const {
    repos,
    dataSource,
    error,
    isLoading,
    customInput,
    customRepoSources,
    setCustomInput,
    submitCustomRepos,
    refresh,
    clearError,
  } = useRepositories(user);

  const {
    recentItems,
    isLoadingActivities,
    refreshRecentItems,
  } = useRecentActivity(user, dataSource);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab');
    return saved === 'board' || saved === 'updates' ? saved : 'board';
  });
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);
  const [displayedRepoCount, setDisplayedRepoCount] = useState<number | null>(null);
  const [displayedCategoryCounts, setDisplayedCategoryCounts] = useState<Record<ColumnKey, number>>({
    Active: 0,
    Stale: 0,
    Dormant: 0,
    Archived: 0,
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const totalReposDisplayed = displayedRepoCount ?? repos.length;

  const handleStatsUpdate = useCallback((totalVisible: number, categoryCounts: Record<ColumnKey, number>) => {
    setDisplayedRepoCount(totalVisible);
    setDisplayedCategoryCounts(categoryCounts);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
    refreshRecentItems();
  }, [refresh, refreshRecentItems]);

  const handleModalSubmit = useCallback(async () => {
    const success = await submitCustomRepos();
    if (success) {
      setIsAddRepoModalOpen(false);
    }
  }, [submitCustomRepos]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-app flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)] mx-auto"></div>
          <p className="mt-4 text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="App min-h-screen bg-surface-app flex flex-col transition-colors">
      {/* User Info Header */}
      <div className="bg-surface-primary border-b border-[var(--border-subtle)] px-8 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-[var(--text-primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* 4 columns representing kanban board */}
              <rect x="2" y="4" width="4" height="16" rx="1"/>
              <rect x="7" y="4" width="4" height="16" rx="1"/>
              <rect x="12" y="4" width="4" height="16" rx="1"/>
              <rect x="17" y="4" width="4" height="16" rx="1"/>
              {/* Cards in each column */}
              <line x1="2.5" y1="7" x2="5.5" y2="7"/>
              <line x1="2.5" y1="10" x2="5.5" y2="10"/>
              <line x1="2.5" y1="13" x2="5.5" y2="13"/>
              <line x1="7.5" y1="7" x2="10.5" y2="7"/>
              <line x1="7.5" y1="10" x2="10.5" y2="10"/>
              <line x1="12.5" y1="7" x2="15.5" y2="7"/>
              <line x1="12.5" y1="10" x2="15.5" y2="10"/>
              <line x1="17.5" y1="7" x2="20.5" y2="7"/>
            </svg>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">DevBoard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddRepoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green text-text-inverse rounded-xl hover:bg-accent-green-strong transition-colors font-medium shadow-sm"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>リポジトリ追加</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
              aria-label="Toggle theme"
              title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <AccountSwitcher />
          </div>
        </div>
        {repos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-[var(--text-muted)] text-[11px] sm:text-xs">
                総数
              </span>
              <span className="text-base font-semibold text-[var(--text-primary)] tabular-nums inline-flex justify-end min-w-[3ch]">
                {totalReposDisplayed}
              </span>
            </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">アクティブ</span>
                <span className="text-sm font-semibold text-[var(--accent-green-emphasis)] tabular-nums inline-flex justify-end min-w-[3ch]">
                  {displayedCategoryCounts.Active}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">停滞</span>
                <span className="text-sm font-semibold text-[var(--accent-yellow-emphasis)] tabular-nums inline-flex justify-end min-w-[3ch]">
                  {displayedCategoryCounts.Stale}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">休眠</span>
                <span className="text-sm font-semibold text-[var(--accent-orange-emphasis)] tabular-nums inline-flex justify-end min-w-[3ch]">
                  {displayedCategoryCounts.Dormant}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">アーカイブ</span>
                <span className="text-sm font-semibold text-[var(--text-secondary)] tabular-nums inline-flex justify-end min-w-[3ch]">
                  {displayedCategoryCounts.Archived}
                </span>
              </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[var(--accent-red-muted)] border-b border-[var(--accent-red-border)] px-6 py-3 text-[var(--text-primary)]">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-[var(--accent-red)] mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-[var(--accent-red-emphasis)]">{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-[var(--accent-red)] hover:text-[var(--accent-red-emphasis)] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}


      {/* Custom Data Banner */}
      {dataSource === 'custom' && (
        <div className="bg-[var(--accent-green-muted)] border-b border-[var(--accent-green-border)] px-6 py-3 text-[var(--text-primary)]">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-[var(--accent-green)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-[var(--accent-green-emphasis)]">
                指定したリポジトリ ({customRepoSources.length} 件) を表示中です。
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        updateCount={recentItems.length}
      />

      {/* Board Tab Content */}
      {activeTab === 'board' && (
        <RepoBoard
          repos={repos}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onStatsUpdate={handleStatsUpdate}
        />
      )}

      {/* Updates Tab Content */}
      {activeTab === 'updates' && (
        <UpdatesTab
          recentItems={recentItems}
          isLoadingActivities={isLoadingActivities}
        />
      )}

      {/* Add Repository Modal */}
      <AddRepoModal
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
        value={customInput}
        onChange={setCustomInput}
        onSubmit={handleModalSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
