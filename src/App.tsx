import { Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider, useAuth, type User } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { TagsProvider } from './contexts/TagsContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { useToast } from './hooks/useToast';
import { useRepositories } from './hooks/useRepositories';
import { useRecentActivities } from './hooks/useRecentActivities';
import { useTodos } from './hooks/useTodos';
import { ColumnKey } from './types';
import { useActiveTab } from './hooks/useActiveTab';
import { useManualRepositories } from './hooks/useManualRepositories';
import { usePreAuthView } from './hooks/usePreAuthView';
import type { TabType } from './components/TabNavigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { buildErrorToast } from './utils/errorHandling';

const TabNavigation = lazy(() => import('./components/TabNavigation').then((m) => ({ default: m.TabNavigation })));
const RepoBoard = lazy(() => import('./components/RepoBoard').then((m) => ({ default: m.RepoBoard })));
const ManualRepoBoard = lazy(() => import('./components/ManualRepoBoard').then((m) => ({ default: m.ManualRepoBoard })));
const ActivityTab = lazy(() => import('./components/ActivityTab').then((m) => ({ default: m.ActivityTab })));
const SplitPanel = lazy(() => import('./components/ui/SplitPanel').then((m) => ({ default: m.SplitPanel })));
const SidebarSummary = lazy(() => import('./components/SidebarSummary').then((m) => ({ default: m.SidebarSummary })));
const Workspace = lazy(() => import('./components/Workspace').then((m) => ({ default: m.Workspace })));
const AddRepoModal = lazy(() => import('./components/AddRepoModal').then((m) => ({ default: m.AddRepoModal })));
const AccountSwitcher = lazy(() => import('./components/AccountSwitcher'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const LandingPage = lazy(() => import('./components/LandingPage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-app flex items-center justify-center transition-colors">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-blue)] mx-auto" />
        <p className="mt-4 text-[var(--text-muted)]">Loading...</p>
      </div>
    </div>
  );
}

interface TabMigrationDialogProps {
  open: boolean;
  legacyTab?: string | null;
  onSelect: (tab: TabType) => void;
}

function TabMigrationDialog({ open, legacyTab, onSelect }: TabMigrationDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="タブ統合の選択"
        className="w-full max-w-md rounded-xl bg-surface-primary border border-[var(--border-strong)] shadow-lg p-inset-xl space-y-4"
      >
        <div className="space-y-2">
          <p className="text-caption text-[var(--text-muted)] font-semibold uppercase tracking-wide">タブ統合</p>
          <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">表示タブを整理しました</h2>
          <p className="text-body-sm text-[var(--text-secondary)] leading-relaxed">
            以前のタブ{legacyTab ? `（${legacyTab}）` : ''}は、今後の「リポジトリ」と「練習」中心の画面に合わせて整理中です。
            まずはリポジトリ画面から始めるのがおすすめです。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-green)] text-text-inverse font-semibold shadow-sm hover:bg-[var(--accent-green-strong)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2"
            onClick={() => onSelect('board')}
          >
            <span>リポジトリから始める</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-strong)] bg-surface-secondary text-[var(--text-primary)] font-semibold shadow-sm hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2"
            onClick={() => onSelect('activity')}
          >
            <span>練習・記録を見る</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 12 8 7 13 12 21 4" />
              <path d="M21 4v6" />
              <rect x="3" y="14" width="6" height="6" rx="1" />
              <rect x="12" y="14" width="9" height="6" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface AuthenticatedAppProps {
  user: User;
}

function AuthenticatedApp({ user }: AuthenticatedAppProps) {
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { activeTab, setActiveTab, needsMigration, pendingLegacyTab, resolveMigration } = useActiveTab();
  const { selectedRepo, isOpen: isWorkspaceOpen, panelHeight, setPanelHeight, toggleWorkspace } = useWorkspace();

  const [customInput, setCustomInput] = useState('');
  const [displayedRepoCount, setDisplayedRepoCount] = useState<number | null>(null);
  const [displayedCategoryCounts, setDisplayedCategoryCounts] = useState<Record<ColumnKey, number>>({
    Active: 0,
    Stale: 0,
    Dormant: 0,
    Archived: 0,
  });
  const [activityRefreshToken, setActivityRefreshToken] = useState(0);
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const {
    repos,
    isLoading: isRepoLoading,
    error: repoError,
    dataSource,
    customRepoSources,
    lastUpdateTime,
    loadRepos,
    refresh: refreshRepos,
    setError: setRepoError,
  } = useRepositories({ accountId: user.username, autoLoad: false });

  const {
    manualRepos,
    manualRepoCount,
    setManualRepos,
    isSaving: isSavingManualRepos,
    addManualReposFromInput,
  } = useManualRepositories({ accountId: user.username, showToast, onErrorChange: setUiError });

  const error = uiError ?? repoError ?? null;

  const { recentItems } = useRecentActivities(user, {
    enabled: true,
    refreshToken: activityRefreshToken,
  });
  const { stats: todoStats } = useTodos({ autoLoad: true });
  const activityBadgeCount = (recentItems?.length || 0) + (todoStats?.total || 0);
  const handleResolveMigration = useCallback(
    (tab: TabType) => {
      resolveMigration(tab);
    },
    [resolveMigration]
  );

  useEffect(() => {
    if (user && repos.length === 0 && !isRepoLoading) {
      loadRepos();
    }
  }, [user, repos.length, isRepoLoading, loadRepos]);

  useEffect(() => {
    const handleOpenModal = () => {
      setIsAddRepoModalOpen(true);
    };
    window.addEventListener('openAddRepoModal', handleOpenModal);
    return () => {
      window.removeEventListener('openAddRepoModal', handleOpenModal);
    };
  }, []);

  const handleManualRepoSubmit = useCallback(async () => {
    const result = await addManualReposFromInput(customInput);
    if (result.success) {
      setCustomInput('');
      setIsAddRepoModalOpen(false);
    }
  }, [addManualReposFromInput, customInput]);

  const handleRefresh = useCallback(async () => {
    await refreshRepos();
    setActivityRefreshToken((prev) => prev + 1);
  }, [refreshRepos]);

  const memoizedHandleStatsUpdate = useCallback(
    (totalVisible: number, categoryCounts: Record<ColumnKey, number>) => {
      setDisplayedRepoCount(totalVisible);
      setDisplayedCategoryCounts(categoryCounts);
    },
    []
  );

  const handleClearError = () => {
    setUiError(null);
    setRepoError(null);
  };

  // Summary stats for sidebar
  const summaryStats = useMemo(
    () => ({
      totalRepos: displayedRepoCount ?? repos.length,
      activeRepos: displayedCategoryCounts.Active ?? 0,
      todoStats: {
        total: todoStats?.total || 0,
        done: todoStats?.done || 0,
        inProgress: todoStats?.inProgress || 0,
        overdue: todoStats?.overdue || 0,
      },
      syncStats: {
        synced: 0, // TODO: Implement sync tracking
        pending: 0,
        error: 0,
      },
    }),
    [
      repos.length,
      displayedCategoryCounts.Active,
      displayedCategoryCounts.Stale,
      displayedCategoryCounts.Dormant,
      displayedCategoryCounts.Archived,
      todoStats?.total,
      todoStats?.done,
      todoStats?.inProgress,
      todoStats?.overdue,
    ]
  );

  const handleSidebarToggle = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="App h-screen bg-surface-app flex flex-col transition-colors overflow-hidden">
      {/* Top Header */}
      <div className="flex-shrink-0 bg-surface-primary border-b border-[var(--border-subtle)] px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-inline-md">
            <svg
              className="w-7 h-7 text-[var(--text-primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="4" width="4" height="16" rx="1" />
              <rect x="7" y="4" width="4" height="16" rx="1" />
              <rect x="12" y="4" width="4" height="16" rx="1" />
              <rect x="17" y="4" width="4" height="16" rx="1" />
              <line x1="2.5" y1="7" x2="5.5" y2="7" />
              <line x1="2.5" y1="10" x2="5.5" y2="10" />
              <line x1="2.5" y1="13" x2="5.5" y2="13" />
              <line x1="7.5" y1="7" x2="10.5" y2="7" />
              <line x1="7.5" y1="10" x2="10.5" y2="10" />
              <line x1="12.5" y1="7" x2="15.5" y2="7" />
              <line x1="12.5" y1="10" x2="15.5" y2="10" />
              <line x1="17.5" y1="7" x2="20.5" y2="7" />
            </svg>
            <h1 className="text-title-3 font-semibold text-[var(--text-primary)]">DevBoard</h1>
          </div>
          <div className="flex items-center gap-inline-md">
            <button
              onClick={() => setIsAddRepoModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent-green text-text-inverse rounded-lg hover:bg-accent-green-strong transition-colors font-medium text-body-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>リポジトリ追加</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] focus-visible:ring-offset-2"
              aria-label="Toggle theme"
              title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <Suspense
              fallback={
                <div
                  className="h-10 w-10 rounded-lg bg-surface-hover animate-pulse"
                  aria-hidden
                />
              }
            >
              <AccountSwitcher />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 bg-[var(--accent-red-muted)] border-b border-[var(--accent-red-border)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-[var(--accent-red)] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-body-sm text-[var(--accent-red-emphasis)]">{error}</span>
            <button onClick={handleClearError} className="ml-auto text-[var(--accent-red)] hover:text-[var(--accent-red-emphasis)] transition-colors">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Data Source Banner */}
      {dataSource === 'custom' && (
        <div className="flex-shrink-0 bg-[var(--accent-green-muted)] border-b border-[var(--accent-green-border)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
          <div className="flex items-center">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-body-sm text-[var(--accent-green-emphasis)]">指定したリポジトリ ({customRepoSources.length} 件) を表示中です。</span>
            </div>
          </div>
        </div>
      )}

      <TabMigrationDialog
        open={needsMigration}
        legacyTab={pendingLegacyTab}
        onSelect={handleResolveMigration}
      />

      {/* Tab Navigation */}
      <Suspense
        fallback={
          <div
            className="h-14 bg-surface-primary border-b border-[var(--border-subtle)]"
            aria-hidden
          />
        }
      >
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activityCount={activityBadgeCount}
          manualRepoCount={manualRepoCount}
        />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Only show on board tab */}
        {activeTab === 'board' && (
          <Suspense
            fallback={
              <div
                className="hidden lg:block w-80 border-r border-[var(--border-subtle)] bg-surface-primary animate-pulse"
                aria-hidden
              />
            }
          >
            <SidebarSummary
              stats={summaryStats}
              isCollapsed={isSidebarCollapsed}
              onCollapseToggle={handleSidebarToggle}
              onCardClick={(type) => {
                // Handle card clicks - could filter view or navigate
                console.log('Card clicked:', type);
              }}
            />
          </Suspense>
        )}

        {/* Main Content with Split Panel */}
        <div className="flex-1 overflow-hidden">
          {/* Board Tab with Split Panel */}
          <div className={activeTab === 'board' ? 'h-full animate-slide-fade-in' : 'hidden'}>
            {activeTab === 'board' && (
              <TagsProvider scope="kanban">
                <Suspense fallback={<LoadingScreen />}>
                  <SplitPanel
                    topPanel={
                      <RepoBoard
                        repos={repos}
                        onRefresh={handleRefresh}
                        onStatsUpdate={memoizedHandleStatsUpdate}
                        lastUpdateTime={lastUpdateTime}
                        isLoading={isRepoLoading}
                      />
                    }
                    bottomPanel={<Workspace />}
                    initialBottomHeight={panelHeight}
                    minBottomHeight={200}
                    maxBottomHeightPercent={80}
                    isBottomCollapsed={!isWorkspaceOpen || !selectedRepo}
                    onCollapseChange={(collapsed) => {
                      if (collapsed) {
                        toggleWorkspace();
                      }
                    }}
                    onHeightChange={setPanelHeight}
                  />
                </Suspense>
              </TagsProvider>
            )}
          </div>

          {/* Activity Tab */}
          <div className={activeTab === 'activity' ? 'h-full overflow-auto animate-slide-fade-in' : 'hidden'}>
            {activeTab === 'activity' && (
              <Suspense fallback={<LoadingScreen />}>
                <ActivityTab repos={repos} />
              </Suspense>
            )}
          </div>

          {/* Manual Repos Tab */}
          <div className={activeTab === 'manual' ? 'h-full overflow-auto animate-slide-fade-in' : 'hidden'}>
            {activeTab === 'manual' && (
              <TagsProvider scope="manual">
                <Suspense fallback={<LoadingScreen />}>
                  <ManualRepoBoard
                    accountId={user.username}
                    manualRepos={manualRepos}
                    onReposChange={setManualRepos}
                  />
                </Suspense>
              </TagsProvider>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <AddRepoModal
          isOpen={isAddRepoModalOpen}
          onClose={() => setIsAddRepoModalOpen(false)}
          value={customInput}
          onChange={setCustomInput}
          onSubmit={handleManualRepoSubmit}
          isLoading={isSavingManualRepos}
        />
      </Suspense>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { view, showLanding, showLogin } = usePreAuthView(user);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (view === 'landing') {
      return (
        <Suspense fallback={<LoadingScreen />}>
          <LandingPage onContinue={showLogin} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<LoadingScreen />}>
        <LoginPage onBack={showLanding} />
      </Suspense>
    );
  }

  return <AuthenticatedApp user={user} />;
}

function AppErrorBoundaryWrapper() {
  const { showToast } = useToast();
  const handleFatalError = useCallback(
    (error: Error) => {
      showToast(
        buildErrorToast(error, 'アプリで予期せぬエラーが発生しました', {
          defaultTitle: '予期せぬエラー',
          fallbackDescription: '操作を続行できませんでした。再度お試しください。',
        })
      );
    },
    [showToast]
  );

  return (
    <ErrorBoundary onError={handleFatalError}>
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppErrorBoundaryWrapper />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
