import { useState, useEffect, useRef, useCallback } from 'react';
import { RepoBoard, TabNavigation, AddRepoModal, UpdatesTab, ManualRepoBoard, TodosTab } from './components';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import AccountSwitcher from './components/AccountSwitcher';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { useToast } from './hooks/useToast';
import { useRepositories } from './hooks/useRepositories';
import { useRecentActivities } from './hooks/useRecentActivities';
import { useTodos } from './hooks/useTodos';
import { Repo, ColumnKey } from './types';
import { fetchRepositoriesByUrls } from './api/repos';
import type { TabType } from './components/TabNavigation';
import { getManualRepos, addMultipleManualRepos } from './utils/manualRepoStorage';
import { getManualColumnConfig } from './utils/manualColumnStorage';
import { getStorageString, setStorageString } from './utils/storage';
import { devError } from './utils/logger';

function AppContent() {
  const { user, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  
  // リポジトリ読み込み管理
  const {
    repos,
    isLoading: isRepoLoading,
    error,
    dataSource,
    customRepoSources,
    lastUpdateTime,
    loadRepos,
    refresh: refreshRepos,
    setError,
  } = useRepositories({ autoLoad: false });

  const [isSavingManualRepos, setIsSavingManualRepos] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [displayedRepoCount, setDisplayedRepoCount] = useState<number | null>(null);
  const [displayedCategoryCounts, setDisplayedCategoryCounts] = useState<Record<ColumnKey, number>>({
    Active: 0,
    Stale: 0,
    Dormant: 0,
    Archived: 0,
  });
  const [columnTitles, setColumnTitles] = useState<Record<ColumnKey, string>>({
    Active: 'アクティブ',
    Stale: '停滞',
    Dormant: '休眠',
    Archived: 'アーカイブ',
  });
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const [manualRepoCount, setManualRepoCount] = useState(0);
  const totalReposDisplayed = displayedRepoCount ?? repos.length;

  // 最近のアクティビティ読み込み
  const { recentItems, isLoading: isLoadingActivities } = useRecentActivities(user, {
    enabled: true,
    refreshToken: activityRefreshToken,
  });

  // Manual repository state management
  const [manualRepos, setManualRepos] = useState<Repo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set());
  const [manualColumns, setManualColumns] = useState<string[]>([]);
  const [preAuthView, setPreAuthView] = useState<'landing' | 'login'>('landing');
  const previousUserRef = useRef(user);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = getStorageString('activeTab', 'board');
    return (saved === 'board' || saved === 'updates' || saved === 'manual' || saved === 'todos') ? saved : 'board';
  });

  // TODO hook
  const { stats: todoStats } = useTodos({ autoLoad: true });

  // Modal state
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);

  // Save active tab to localStorage
  useEffect(() => {
    setStorageString('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (previousUserRef.current && !user) {
      setPreAuthView('landing');
    }
    previousUserRef.current = user;
  }, [user]);

  // Listen for custom event to open add repo modal
  useEffect(() => {
    const handleOpenModal = () => {
      setIsAddRepoModalOpen(true);
    };
    window.addEventListener('openAddRepoModal', handleOpenModal);
    return () => {
      window.removeEventListener('openAddRepoModal', handleOpenModal);
    };
  }, []);

  const parseCustomInput = (value: string): string[] => {
    return value
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, 25);
  };

  const updateManualRepoStateFromList = useCallback((repos: Repo[]) => {
    setManualRepos(repos);
    setManualRepoCount(repos.length);
  }, []);

  const refreshManualRepoState = useCallback(() => {
    const updatedRepos = getManualRepos();
    updateManualRepoStateFromList(updatedRepos);
  }, [updateManualRepoStateFromList]);

  const handleRefresh = useCallback(async () => {
    await refreshRepos();
    // Trigger activity refresh
    setActivityRefreshToken((prev) => prev + 1);
  }, [refreshRepos]);

  // Handle manual repository addition from AddRepoModal
  const handleManualRepoSubmit = async () => {
    const sources = parseCustomInput(customInput);
    if (sources.length === 0) {
      setError('リポジトリ URL または `owner/repo` を入力してください');
      return;
    }

    setIsSavingManualRepos(true);
    setError(null);
    try {
      // Force refresh for manual additions
      const { repos: fetched, failed } = await fetchRepositoriesByUrls(sources, true);
      if (fetched.length === 0) {
        const message = failed.length
          ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
          : '有効なリポジトリを入力してください。';
        setError(message);
        showToast({
          variant: 'error',
          title: 'リポジトリの追加に失敗しました',
          description: message,
        });
        return;
      }

      // Add source information and save to manualRepoStorage
      const reposWithSource = fetched.map((repo) => ({
        ...repo,
        source: {
          type: 'manual' as const,
          addedAt: new Date().toISOString(),
        },
      }));

      // Save to manualRepoStorage
      const success = addMultipleManualRepos(reposWithSource);
      if (!success) {
        const message = 'リポジトリの保存に失敗しました';
        setError(message);
        showToast({
          variant: 'error',
          title: 'リポジトリの追加に失敗しました',
          description: message,
        });
        return;
      }

      // Update state
      refreshManualRepoState();

      // Clear input
      setCustomInput('');

      // Close modal
      setIsAddRepoModalOpen(false);
      showToast({
        variant: 'success',
        title: 'リポジトリを保存しました',
        description: `${reposWithSource.length} 件を追加しました`,
      });

      if (failed.length > 0) {
        setError(`一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`);
      }
    } catch (err) {
      devError('Failed to add manual repositories:', err);
      const message = err instanceof Error ? err.message : 'リポジトリの追加に失敗しました';
      setError(message);
      showToast({
        variant: 'error',
        title: 'リポジトリの追加に失敗しました',
        description: message,
      });
    } finally {
      setIsSavingManualRepos(false);
    }
  };

  // Auto-load repos when user logs in
  useEffect(() => {
    if (user && repos.length === 0 && !isRepoLoading) {
      loadRepos();
    }
  }, [user, repos.length, isRepoLoading, loadRepos]);

  // Load manual repos from localStorage on mount
  useEffect(() => {
    refreshManualRepoState();

    // Load manual column configuration
    const columnConfig = getManualColumnConfig();
    setManualColumns(columnConfig.columns);
  }, [refreshManualRepoState]);

  // Handle stats update from RepoBoard
  const handleStatsUpdate = (totalVisible: number, categoryCounts: Record<ColumnKey, number>, columnTitles: Record<ColumnKey, string>) => {
    setDisplayedRepoCount(totalVisible);
    setDisplayedCategoryCounts(categoryCounts);
    setColumnTitles(columnTitles);
  };

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
    if (preAuthView === 'landing') {
      return <LandingPage onContinue={() => setPreAuthView('login')} />;
    }
    return <LoginPage onBack={() => setPreAuthView('landing')} />;
  }

  return (
    <div className="App min-h-screen bg-surface-app flex flex-col transition-colors">
      {/* User Info Header */}
      <div className="bg-surface-primary border-b border-[var(--border-subtle)] px-8 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-inline-md">
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
            <h1 className="text-title-2 font-semibold text-[var(--text-primary)]">DevBoard</h1>
          </div>
          <div className="flex items-center gap-inline-md">
            <button
              onClick={() => setIsAddRepoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green text-text-inverse rounded-xl hover:bg-accent-green-strong transition-colors font-semibold shadow-sm motion-safe:duration-250 motion-safe:ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2 focus-visible:ring-opacity-50"
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
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors motion-safe:duration-250 motion-safe:ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2 focus-visible:ring-opacity-50"
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
          <div className="mt-4 flex flex-wrap items-center gap-4 text-caption sm:text-body-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-[var(--text-muted)] text-[11px] sm:text-caption">
                総数
              </span>
              <span className="text-body font-semibold text-[var(--text-primary)]">
                {totalReposDisplayed}
              </span>
            </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Active}</span>
                <span className="text-body-sm font-semibold text-[var(--accent-green-emphasis)]">
                  {displayedCategoryCounts.Active}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Stale}</span>
                <span className="text-body-sm font-semibold text-[var(--accent-yellow-emphasis)]">
                  {displayedCategoryCounts.Stale}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Dormant}</span>
                <span className="text-body-sm font-semibold text-[var(--accent-orange-emphasis)]">
                  {displayedCategoryCounts.Dormant}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Archived}</span>
                <span className="text-body-sm font-semibold text-[var(--text-secondary)]">
                  {displayedCategoryCounts.Archived}
                </span>
              </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-[var(--accent-red-muted)] border-b border-[var(--accent-red-border)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
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
            <span className="text-body-sm text-[var(--accent-red-emphasis)]">{error}</span>
            <button
              onClick={() => setError(null)}
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
        <div className="bg-[var(--accent-green-muted)] border-b border-[var(--accent-green-border)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
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
              <span className="text-body-sm text-[var(--accent-green-emphasis)]">
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
        manualRepoCount={manualRepoCount}
        todoCount={todoStats?.total || 0}
      />

      {/* Board Tab Content */}
      <div className={activeTab === 'board' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'board' && (
          <RepoBoard
            repos={repos}
            onRefresh={handleRefresh}
            onStatsUpdate={handleStatsUpdate}
            lastUpdateTime={lastUpdateTime}
            isLoading={isRepoLoading}
          />
        )}
      </div>

      {/* Updates Tab Content */}
      <div className={activeTab === 'updates' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'updates' && (
          <UpdatesTab
            recentItems={recentItems}
            isLoadingActivities={isLoadingActivities}
          />
        )}
      </div>

      {/* Manual Repository Board Tab Content */}
      <div className={activeTab === 'manual' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'manual' && (
          <ManualRepoBoard
            manualRepos={manualRepos}
            selectedRepoIds={selectedRepoIds}
            manualColumns={manualColumns}
            onStatsUpdate={(count) => {
              setManualRepoCount(count);
              // Reload manual repos when count changes
              refreshManualRepoState();
            }}
            onReposChange={updateManualRepoStateFromList}
            onSelectedReposChange={setSelectedRepoIds}
            onColumnsChange={setManualColumns}
          />
        )}
      </div>

      {/* TODOs Tab Content */}
      <div className={activeTab === 'todos' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'todos' && (
          <TodosTab repos={repos} />
        )}
      </div>

      {/* Add Repository Modal */}
      <AddRepoModal
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
        value={customInput}
        onChange={setCustomInput}
        onSubmit={handleManualRepoSubmit}
        isLoading={isSavingManualRepos}
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
