import { useState, useEffect } from 'react';
import { RepoBoard, TabNavigation, AddRepoModal, UpdatesTab, ManualRepoBoard } from './components';
import LoginPage from './components/LoginPage';
import AccountSwitcher from './components/AccountSwitcher';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Repo, ColumnKey } from './types';
import { fetchUserRepos, fetchRepositoriesByUrls, fetchLatestIssues, fetchLatestPullRequests, RecentItem } from './api/repos';
import type { TabType } from './components/TabNavigation';
import { getManualRepoCount, getManualRepos, addMultipleManualRepos } from './utils/manualRepoStorage';
import { getManualColumnConfig, ManualColumnKey } from './utils/manualColumnStorage';

type DataSource = 'viewer' | 'custom';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('viewer');
  const [customInput, setCustomInput] = useState('');
  const [customRepoSources, setCustomRepoSources] = useState<string[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
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

  // Manual repository state management
  const [manualRepos, setManualRepos] = useState<Repo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set());
  const [manualColumns, setManualColumns] = useState<string[]>([]);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved === 'board' || saved === 'updates' || saved === 'manual') ? saved : 'board';
  });

  // Modal state
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

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

  const loadCustomRepos = async (sources: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const { repos: fetched, failed } = await fetchRepositoriesByUrls(sources);
      if (fetched.length === 0) {
        const message = failed.length
          ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
          : '有効なリポジトリを入力してください。';
        setError(message);
        return;
      }

      const uniqueNames = Array.from(new Set(fetched.map((repo) => repo.nameWithOwner)));
      setRepos(fetched);
      setDataSource('custom');
      setCustomRepoSources(uniqueNames);
      setCustomInput(uniqueNames.join('\n'));

      if (failed.length > 0) {
        setError(`一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to load custom repositories:', err);
      setError(err instanceof Error ? err.message : 'リポジトリの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRepos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const realRepos = await fetchUserRepos();
      setRepos(realRepos);
      setDataSource('viewer');
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (dataSource === 'viewer') {
      // Reload from API
      loadRepos();
    } else if (dataSource === 'custom') {
      if (customRepoSources.length > 0) {
        loadCustomRepos(customRepoSources);
      }
    }
    // Trigger activity refresh
    setActivityRefreshToken((prev) => prev + 1);
  };

  // Handle manual repository addition from AddRepoModal
  const handleManualRepoSubmit = async () => {
    const sources = parseCustomInput(customInput);
    if (sources.length === 0) {
      setError('リポジトリ URL または `owner/repo` を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { repos: fetched, failed } = await fetchRepositoriesByUrls(sources);
      if (fetched.length === 0) {
        const message = failed.length
          ? `指定されたリポジトリを読み込めませんでした: ${failed.join(', ')}`
          : '有効なリポジトリを入力してください。';
        setError(message);
        setIsLoading(false);
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
        setError('リポジトリの保存に失敗しました');
        setIsLoading(false);
        return;
      }

      // Update state
      const updatedRepos = getManualRepos();
      setManualRepos(updatedRepos);
      setManualRepoCount(updatedRepos.length);

      // Clear input
      setCustomInput('');

      // Close modal
      setIsAddRepoModalOpen(false);

      if (failed.length > 0) {
        setError(`一部のリポジトリを読み込めませんでした: ${failed.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to add manual repositories:', err);
      setError(err instanceof Error ? err.message : 'リポジトリの追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // Load latest Issues/PRs when user is authenticated
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (user) {
        setIsLoadingActivities(true);
        try {
          const [issues, pullRequests] = await Promise.all([
            fetchLatestIssues(),
            fetchLatestPullRequests(),
          ]);
          const combined = [...issues, ...pullRequests];
          if (!cancelled) setRecentItems(combined);
        } catch (err) {
          console.error('Failed to fetch latest items:', err);
          if (!cancelled) setRecentItems([]);
        } finally {
          if (!cancelled) setIsLoadingActivities(false);
        }
      } else {
        setRecentItems([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user, dataSource, activityRefreshToken]);

  // Auto-load repos when user logs in
  useEffect(() => {
    if (user && repos.length === 0 && !isLoading) {
      loadRepos();
    }
  }, [user]);

  // Load manual repos from localStorage on mount
  useEffect(() => {
    const loadedRepos = getManualRepos();
    setManualRepos(loadedRepos);
    setManualRepoCount(loadedRepos.length);
    
    // Load manual column configuration
    const columnConfig = getManualColumnConfig();
    setManualColumns(columnConfig.columns);
  }, []);

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
              <span className="text-base font-semibold text-[var(--text-primary)]">
                {totalReposDisplayed}
              </span>
            </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Active}</span>
                <span className="text-sm font-semibold text-[var(--accent-green-emphasis)]">
                  {displayedCategoryCounts.Active}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Stale}</span>
                <span className="text-sm font-semibold text-[var(--accent-yellow-emphasis)]">
                  {displayedCategoryCounts.Stale}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Dormant}</span>
                <span className="text-sm font-semibold text-[var(--accent-orange-emphasis)]">
                  {displayedCategoryCounts.Dormant}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--text-muted)]">{columnTitles.Archived}</span>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
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
        manualRepoCount={manualRepoCount}
      />

      {/* Board Tab Content */}
      <div className={activeTab === 'board' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'board' && (
          <RepoBoard
            repos={repos}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            onStatsUpdate={handleStatsUpdate}
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
              const updatedRepos = getManualRepos();
              setManualRepos(updatedRepos);
            }}
            onReposChange={(repos) => {
              setManualRepos(repos);
              setManualRepoCount(repos.length);
            }}
            onSelectedReposChange={setSelectedRepoIds}
            onColumnsChange={setManualColumns}
          />
        )}
      </div>

      {/* Add Repository Modal */}
      <AddRepoModal
        isOpen={isAddRepoModalOpen}
        onClose={() => setIsAddRepoModalOpen(false)}
        value={customInput}
        onChange={setCustomInput}
        onSubmit={handleManualRepoSubmit}
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
