import { useState, useEffect } from 'react';
import { RepoBoard, RepoInputForm, DashboardStats } from './components';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Repo, ColumnKey } from './types';
import { fetchUserRepos, fetchRepositoriesByUrls, fetchLatestIssues, fetchLatestPullRequests, RecentItem } from './api/repos';

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
    <div className="App min-h-screen bg-gray-100">
      {/* User Info Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">GitHub Dashboard</h1>
              <span className="text-sm text-gray-500">
                Logged in as <span className="font-medium text-gray-900">{user.username}</span>
              </span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium w-fit"
            >
              Logout
            </button>
          </div>
          {repos.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-600">
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

      <div className="px-6 py-2 border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <RepoInputForm
            value={customInput}
            onChange={setCustomInput}
            onSubmit={handleCustomSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Dashboard Stats */}
      {repos.length > 0 && (
        <DashboardStats
          activityType={activityType}
          onActivityTypeChange={setActivityType}
          recentItems={recentItems}
          isLoadingActivities={isLoadingActivities}
        />
      )}

      {/* Main Board */}
      <RepoBoard
        repos={repos}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        onStatsUpdate={handleStatsUpdate}
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
