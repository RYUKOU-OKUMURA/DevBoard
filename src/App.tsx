import { useState, useEffect } from 'react';
import { RepoBoard, TabNavigation, AddRepoModal, UpdatesTab } from './components';
import LoginPage from './components/LoginPage';
import AccountSwitcher from './components/AccountSwitcher';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Repo, ColumnKey } from './types';
import { fetchUserRepos, fetchRepositoriesByUrls, fetchLatestIssues, fetchLatestPullRequests, RecentItem } from './api/repos';
import type { TabType } from './components/TabNavigation';

type DataSource = 'viewer' | 'custom';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('viewer');
  const [customInput, setCustomInput] = useState('');
  const [customRepoSources, setCustomRepoSources] = useState<string[]>([]);
  const [activityType, setActivityType] = useState<'issues' | 'pulls'>('issues');
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [displayedRepoCount, setDisplayedRepoCount] = useState<number | null>(null);
  const [displayedCategoryCounts, setDisplayedCategoryCounts] = useState<Record<ColumnKey, number>>({
    Active: 0,
    Stale: 0,
    Dormant: 0,
    Archived: 0,
  });
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const totalReposDisplayed = displayedRepoCount ?? repos.length;

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved === 'board' || saved === 'updates') ? saved : 'board';
  });

  // Modal state
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);

  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

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

  const handleCustomSubmit = async () => {
    const sources = parseCustomInput(customInput);
    if (sources.length === 0) {
      setError('リポジトリ URL または `owner/repo` を入力してください');
      return;
    }
    await loadCustomRepos(sources);
  };

  // Load latest Issues/PRs when user is authenticated
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (user) {
        setIsLoadingActivities(true);
        try {
          const items = activityType === 'issues' ?
            await fetchLatestIssues() :
            await fetchLatestPullRequests();
          if (!cancelled) setRecentItems(items);
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
  }, [user, dataSource, activityRefreshToken, activityType]);

  // Auto-load repos when user logs in
  useEffect(() => {
    if (user && repos.length === 0 && !isLoading) {
      loadRepos();
    }
  }, [user]);

  // Handle stats update from RepoBoard
  const handleStatsUpdate = (totalVisible: number, categoryCounts: Record<ColumnKey, number>) => {
    setDisplayedRepoCount(totalVisible);
    setDisplayedCategoryCounts(categoryCounts);
  };

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="App min-h-screen bg-gray-50 flex flex-col">
      {/* User Info Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="w-8 h-8 text-gray-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">GitHub Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddRepoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
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
            <AccountSwitcher />
          </div>
        </div>
        {repos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500 text-[11px] sm:text-xs">
                総数
              </span>
              <span className="text-base font-semibold text-gray-900">
                {totalReposDisplayed}
              </span>
            </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">アクティブ</span>
                <span className="text-sm font-semibold text-green-700">
                  {displayedCategoryCounts.Active}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">停滞</span>
                <span className="text-sm font-semibold text-yellow-700">
                  {displayedCategoryCounts.Stale}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">休眠</span>
                <span className="text-sm font-semibold text-orange-700">
                  {displayedCategoryCounts.Dormant}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">アーカイブ</span>
                <span className="text-sm font-semibold text-gray-700">
                  {displayedCategoryCounts.Archived}
                </span>
              </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-red-400 mr-2"
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
            <span className="text-sm text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
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
        <div className="bg-green-50 border-b border-green-200 px-6 py-3">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-500"
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
              <span className="text-sm text-green-900">
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
          activityType={activityType}
          onActivityTypeChange={setActivityType}
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
        onSubmit={handleCustomSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
