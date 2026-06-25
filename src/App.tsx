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
import { useRepositoryView } from './hooks/useRepositoryView';
import { useAdvancedSubTab } from './hooks/useAdvancedSubTab';
import { useManualRepositories } from './hooks/useManualRepositories';
import { usePreAuthView } from './hooks/usePreAuthView';
import type { TabType } from './components/TabNavigation';
import { ErrorBoundary } from './components/ErrorBoundary';
import { buildErrorToast } from './utils/errorHandling';
import { focusRing } from './lib/focusRing';

const TabNavigation = lazy(() => import('./components/TabNavigation').then((m) => ({ default: m.TabNavigation })));
const RepositoryHome = lazy(() => import('./components/repositories/RepositoryHome').then((m) => ({ default: m.RepositoryHome })));
const PracticeHome = lazy(() => import('./components/practice/PracticeHome').then((m) => ({ default: m.PracticeHome })));
const AdvancedHome = lazy(() => import('./components/advanced/AdvancedHome').then((m) => ({ default: m.AdvancedHome })));
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
    <div className="flex min-h-screen items-center justify-center bg-surface-app transition-colors motion-reduce:transition-none">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[var(--accent-blue)] motion-reduce:animate-none" />
        <p className="mt-stack-sm text-body-sm text-[var(--text-muted)]">読み込み中…</p>
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-inset-md backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="タブ統合の選択"
        className="w-full max-w-md space-y-4 rounded-lg border border-[var(--border-strong)] bg-surface-primary p-inset-xl shadow-lg"
      >
        <div className="space-y-2">
          <p className="text-caption font-semibold text-[var(--text-muted)]">タブ統合</p>
          <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">表示タブを整理しました</h2>
          <p className="text-body-sm text-[var(--text-secondary)] leading-relaxed">
            以前のタブ{legacyTab ? `（${legacyTab}）` : ''}は、今後の「リポジトリ」と「練習」中心の画面に合わせて整理中です。
            まずはリポジトリ画面から始めるのがおすすめです。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-stack-sm sm:grid-cols-2">
          <button
            type="button"
            className={`inline-flex w-full items-center justify-center gap-inline-sm rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
            onClick={() => onSelect('board')}
          >
            <span>リポジトリから始める</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <button
            type="button"
            className={`inline-flex w-full items-center justify-center gap-inline-sm rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
            onClick={() => onSelect('advanced')}
          >
            <span>高度な機能を見る</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const { subTab: advancedSubTab, setSubTab: setAdvancedSubTab } = useAdvancedSubTab(
    activeTab,
    user.userId || user.username
  );
  const { viewMode: repositoryViewMode, setViewMode: setRepositoryViewMode } = useRepositoryView(
    user.userId || user.username
  );

  // URL履歴にviewを同期し、ブラウザ戻る/進むでビューModeを復元する
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeTab !== 'board') return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get('view');
    if (current !== repositoryViewMode) {
      params.set('view', repositoryViewMode);
      const query = params.toString();
      const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
      // タブ切り替えのpushStateとは独立に、ビュー変更はreplaceで同期（履歴膨張を避ける）
      window.history.replaceState({ view: repositoryViewMode }, '', newUrl);
    }
  }, [repositoryViewMode, activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      if (activeTab !== 'board') return;
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get('view');
      if (urlView === 'all' || urlView === 'kanban' || urlView === 'roadmap') {
        setRepositoryViewMode(urlView);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeTab, setRepositoryViewMode]);

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

  const handleBackToRepositoryHome = useCallback(() => {
    setActiveTab('board');
  }, [setActiveTab]);

  const legacyRepositoryPanel = (
    <div className="flex h-full flex-col bg-surface-app">
      <div className="flex shrink-0 flex-col gap-stack-sm border-b border-[var(--border-subtle)] bg-surface-primary px-inset-lg py-inset-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-caption font-semibold text-[var(--text-muted)]">高度な整理</p>
          <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">旧カンバンと保存ビュー</h2>
        </div>
        <button
          type="button"
          onClick={handleBackToRepositoryHome}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors motion-reduce:transition-none hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)]"
        >
          リポジトリタブへ戻る
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <RepoBoard
          repos={repos}
          onRefresh={handleRefresh}
          onStatsUpdate={memoizedHandleStatsUpdate}
          lastUpdateTime={lastUpdateTime}
          isLoading={isRepoLoading}
        />
      </div>
    </div>
  );

  const repositoryPanel = (
    <RepositoryHome
      accountId={user.userId || user.username}
      repos={repos}
      onRefresh={handleRefresh}
      onStatsUpdate={memoizedHandleStatsUpdate}
      lastUpdateTime={lastUpdateTime}
      isLoading={isRepoLoading}
      onOpenAdvancedFeatures={() => setActiveTab('advanced')}
      onOpenPracticeHome={() => setActiveTab('practice')}
      viewMode={repositoryViewMode}
      onViewModeChange={setRepositoryViewMode}
    />
  );

  return (
    <div className="App flex h-screen flex-col overflow-hidden bg-surface-app transition-colors motion-reduce:transition-none">
      {/* Top Header */}
      <div className="flex-shrink-0 border-b border-[var(--border-subtle)] bg-surface-primary px-inset-md py-inset-sm shadow-sm sm:px-inset-lg">
        <div className="flex flex-wrap items-center justify-between gap-stack-sm">
          <div className="flex min-w-0 items-center gap-inline-md">
            <svg
              className="h-7 w-7 shrink-0 text-[var(--text-primary)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
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
          <div className="flex min-w-0 items-center gap-inline-sm sm:gap-inline-md">
            <button
              type="button"
              onClick={() => setIsAddRepoModalOpen(true)}
              className={`inline-flex min-h-10 items-center justify-center gap-inline-sm rounded-lg bg-accent-green px-inset-sm py-inset-xs text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-accent-green-strong sm:px-inset-md ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
            >
              <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">リポジトリ追加</span>
              <span className="sm:hidden">追加</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover hover:text-[var(--text-primary)] ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? (
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <Suspense
              fallback={
                <div
                  className="h-10 w-10 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none"
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
        <div className="flex-shrink-0 border-b border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
          <div className="flex items-center gap-inline-sm">
            <svg className="h-5 w-5 shrink-0 text-[var(--accent-red)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="min-w-0 text-body-sm text-[var(--accent-red-emphasis)]">{error}</span>
            <button
              type="button"
              onClick={handleClearError}
              className={`ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--accent-red)] transition-colors motion-reduce:transition-none hover:text-[var(--accent-red-emphasis)] ${focusRing.default} focus-visible:ring-[var(--accent-red)]`}
              aria-label="エラーを閉じる"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Data Source Banner */}
      {dataSource === 'custom' && (
        <div className="flex-shrink-0 border-b border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
          <div className="flex items-center">
            <div className="flex items-center gap-inline-sm">
              <svg className="h-5 w-5 shrink-0 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          advancedCount={activityBadgeCount + manualRepoCount}
        />
      </Suspense>

      {/* 現在のビュー表示 - リポジトリタブのときだけタブ直下に出す */}
      {activeTab === 'board' && (
        <div
          className="flex shrink-0 items-center gap-inline-xs border-b border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-xs text-caption text-[var(--text-muted)] sm:px-inset-lg motion-reduce:transition-none"
          aria-live="polite"
        >
          <span>今:</span>
          <span className="font-semibold text-[var(--accent-green-emphasis)]">
            {repositoryViewMode === 'roadmap' ? 'ロードマップ' : repositoryViewMode === 'kanban' ? 'カンバン' : 'すべて'}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Only show with the legacy advanced board */}
        {activeTab === 'advanced' && advancedSubTab === 'legacy' && (
          <Suspense
            fallback={
              <div
                className="hidden w-80 animate-pulse border-r border-[var(--border-subtle)] bg-surface-primary motion-reduce:animate-none lg:block"
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
          {/* Board Tab - 常にRepositoryHome（1カラム一覧） */}
          <div className={activeTab === 'board' ? 'h-full animate-slide-fade-in motion-reduce:animate-none' : 'hidden'}>
            {activeTab === 'board' && (
              <TagsProvider scope="kanban">
                <Suspense fallback={<LoadingScreen />}>
                  {repositoryPanel}
                </Suspense>
              </TagsProvider>
            )}
          </div>

          {/* Practice Tab */}
          <div className={activeTab === 'practice' ? 'h-full overflow-auto animate-slide-fade-in motion-reduce:animate-none' : 'hidden'}>
            {activeTab === 'practice' && (
              <Suspense fallback={<LoadingScreen />}>
                <PracticeHome accountId={user.userId || user.username} repos={repos} />
              </Suspense>
            )}
          </div>

          {/* Advanced Tab - サブタブで概要/旧カンバン/Activity/手動追加/TODO・AI を切り替え */}
          <div className={activeTab === 'advanced' ? 'h-full overflow-hidden animate-slide-fade-in motion-reduce:animate-none' : 'hidden'}>
            {activeTab === 'advanced' && (
              <Suspense fallback={<LoadingScreen />}>
                <AdvancedHome
                  activeSubTab={advancedSubTab}
                  onSubTabChange={setAdvancedSubTab}
                  activityCount={activityBadgeCount}
                  manualRepoCount={manualRepoCount}
                  onOpenActivity={() => setAdvancedSubTab('activity')}
                  onOpenManualRepos={() => setAdvancedSubTab('manual')}
                  onOpenLegacyBoard={() => setAdvancedSubTab('legacy')}
                  legacyContent={
                    <SplitPanel
                      topPanel={legacyRepositoryPanel}
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
                  }
                  activityContent={<ActivityTab repos={repos} />}
                  manualContent={
                    <TagsProvider scope="manual">
                      <ManualRepoBoard
                        accountId={user.username}
                        manualRepos={manualRepos}
                        onReposChange={setManualRepos}
                      />
                    </TagsProvider>
                  }
                  todoAiContent={null}
                />
              </Suspense>
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
