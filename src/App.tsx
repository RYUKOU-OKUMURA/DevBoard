import { useState, useEffect, useCallback } from 'react';
import { RepoBoard, TabNavigation, AddRepoModal, UpdatesTab, ManualRepoBoard, TodosTab } from './components';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import AccountSwitcher from './components/AccountSwitcher';
import { AuthProvider, useAuth, type User } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { useToast } from './hooks/useToast';
import { useRepositories } from './hooks/useRepositories';
import { useRecentActivities } from './hooks/useRecentActivities';
import { useTodos } from './hooks/useTodos';
import { ColumnKey } from './types';
import { useActiveTab } from './hooks/useActiveTab';
import { useManualRepositories } from './hooks/useManualRepositories';
import { usePreAuthView } from './hooks/usePreAuthView';

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

interface AuthenticatedAppProps {
  user: User;
}

function AuthenticatedApp({ user }: AuthenticatedAppProps) {
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { activeTab, setActiveTab } = useActiveTab();

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
  const [isAddRepoModalOpen, setIsAddRepoModalOpen] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

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
  } = useRepositories({ autoLoad: false });

  const {
    manualRepos,
    manualRepoCount,
    setManualRepos,
    isSaving: isSavingManualRepos,
    addManualReposFromInput,
  } = useManualRepositories({ showToast, onErrorChange: setUiError });

  const totalReposDisplayed = displayedRepoCount ?? repos.length;
  const error = uiError ?? repoError ?? null;

  const { recentItems, isLoading: isLoadingActivities } = useRecentActivities(user, {
    enabled: true,
    refreshToken: activityRefreshToken,
  });
  const { stats: todoStats } = useTodos({ autoLoad: true });

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

  const handleStatsUpdate = (
    totalVisible: number,
    categoryCounts: Record<ColumnKey, number>,
    updatedColumnTitles: Record<ColumnKey, string>
  ) => {
    setDisplayedRepoCount(totalVisible);
    setDisplayedCategoryCounts(categoryCounts);
    setColumnTitles(updatedColumnTitles);
  };

  const handleClearError = () => {
    setUiError(null);
    setRepoError(null);
  };

  return (
    <div className="App min-h-screen bg-surface-app flex flex-col transition-colors">
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
            <h1 className="text-title-2 font-semibold text-[var(--text-primary)]">DevBoard</h1>
          </div>
          <div className="flex items-center gap-inline-md">
            <button
              onClick={() => setIsAddRepoModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green text-text-inverse rounded-xl hover:bg-accent-green-strong transition-colors font-semibold shadow-sm motion-safe:duration-250 motion-safe:ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-2 focus-visible:ring-opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <AccountSwitcher />
          </div>
        </div>
        {repos.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-caption sm:text-body-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-[var(--text-muted)] text-[11px] sm:text-caption">総数</span>
              <span className="text-body font-semibold text-[var(--text-primary)]">{totalReposDisplayed}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">{columnTitles.Active}</span>
              <span className="text-body-sm font-semibold text-[var(--accent-green-emphasis)]">{displayedCategoryCounts.Active}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">{columnTitles.Stale}</span>
              <span className="text-body-sm font-semibold text-[var(--accent-yellow-emphasis)]">{displayedCategoryCounts.Stale}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">{columnTitles.Dormant}</span>
              <span className="text-body-sm font-semibold text-[var(--accent-orange-emphasis)]">{displayedCategoryCounts.Dormant}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[var(--text-muted)]">{columnTitles.Archived}</span>
              <span className="text-body-sm font-semibold text-[var(--text-secondary)]">{displayedCategoryCounts.Archived}</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-[var(--accent-red-muted)] border-b border-[var(--accent-red-border)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
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

      {dataSource === 'custom' && (
        <div className="bg-[var(--accent-green-muted)] border-b border-[var(--accent-green-border)] px-inset-lg py-inset-sm text-[var(--text-primary)]">
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

      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        updateCount={recentItems.length}
        manualRepoCount={manualRepoCount}
        todoCount={todoStats?.total || 0}
      />

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

      <div className={activeTab === 'updates' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'updates' && (
          <UpdatesTab recentItems={recentItems} isLoadingActivities={isLoadingActivities} />
        )}
      </div>

      <div className={activeTab === 'manual' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'manual' && (
          <ManualRepoBoard manualRepos={manualRepos} onReposChange={setManualRepos} />
        )}
      </div>

      <div className={activeTab === 'todos' ? 'animate-slide-fade-in' : 'hidden'}>
        {activeTab === 'todos' && <TodosTab repos={repos} />}
      </div>

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

function AppContent() {
  const { user, loading } = useAuth();
  const { view, showLanding, showLogin } = usePreAuthView(user);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (view === 'landing') {
      return <LandingPage onContinue={showLogin} />;
    }
    return <LoginPage onBack={showLanding} />;
  }

  return <AuthenticatedApp user={user} />;
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
