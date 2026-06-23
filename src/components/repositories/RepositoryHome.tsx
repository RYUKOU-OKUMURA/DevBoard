import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppConfig, ColumnKey, Repo, SortOrder } from '../../types';
import { DEFAULT_CLASSIFY_CONFIG, classifyRepo, configToOptions } from '../../lib/classifyRepo';
import { formatLastUpdateTime } from '../../utils/timeFormatter';
import { focusRing } from '../../lib/focusRing';
import { useTagsContext } from '../../contexts/TagsContext';
import { getStorageItem } from '../../utils/storage';
import { useRepositoryMeta } from '../../hooks/useRepositoryMeta';
import { useRepositoryView } from '../../hooks/useRepositoryView';
import { usePracticeIssues } from '../../hooks/usePracticeIssues';
import { usePracticePullRequests } from '../../hooks/usePracticePullRequests';
import { GithubTermHint } from '../practice/GithubTermHint';
import { RepositoryDetailPanel } from './RepositoryDetailPanel';
import { RepositoryList } from './RepositoryList';
import { RepositoryProgressKanban } from './RepositoryProgressKanban';
import { RepositoryProgressRoadmap } from './RepositoryProgressRoadmap';
import { RepositoryViewSwitcher } from './RepositoryViewSwitcher';
import { resolveRepositoryMeta } from './repositoryProgressModel';
import {
  HIDDEN_REPOS_STORAGE_KEY,
  REPOSITORY_HOME_COLUMN_TITLES,
  countRepositoryHealth,
  getVisibleRepositoryItems,
} from './repositoryHomeModel';

interface RepositoryHomeProps {
  accountId: string;
  repos: Repo[];
  config?: AppConfig;
  isLoading?: boolean;
  onRefresh?: () => void;
  onStatsUpdate?: (
    totalVisible: number,
    categoryCounts: Record<ColumnKey, number>,
    columnTitles: Record<ColumnKey, string>
  ) => void;
  lastUpdateTime?: number | null;
  onOpenAdvancedFeatures?: () => void;
  onOpenPracticeHome?: () => void;
}

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'lastUpdated', label: '最終更新が新しい順' },
  { value: 'name', label: '名前の昇順' },
];

export function RepositoryHome({
  accountId,
  repos,
  config = DEFAULT_CLASSIFY_CONFIG,
  isLoading = false,
  onRefresh,
  onStatsUpdate,
  lastUpdateTime,
  onOpenAdvancedFeatures,
  onOpenPracticeHome,
}: RepositoryHomeProps) {
  const { getTagObjectsForRepo } = useTagsContext();
  const { getMeta, saveError: repositoryMetaSaveError, updateMeta } = useRepositoryMeta(accountId);
  const { viewMode, setViewMode } = useRepositoryView(accountId);
  const {
    createIssueDraft,
    createGitHubIssueFromDraft,
    getDraftsForRepo,
    publishError: practiceIssuePublishError,
    publishingDraftId: publishingPracticeIssueDraftId,
    saveError: practiceIssueSaveError,
  } = usePracticeIssues(accountId);
  const {
    createPullRequestDraft,
    getDraftsForRepo: getPullRequestDraftsForRepo,
    saveError: practicePullRequestSaveError,
  } = usePracticePullRequests(accountId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('lastUpdated');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [hiddenRepoIds] = useState<Set<string>>(() => {
    const restored = getStorageItem<string[]>(HIDDEN_REPOS_STORAGE_KEY, []);
    return new Set(restored);
  });

  const classifyOptions = useMemo(() => configToOptions(config), [config]);

  const visibleRepos = useMemo(
    () => getVisibleRepositoryItems(repos, searchQuery, sortOrder, hiddenRepoIds, getTagObjectsForRepo),
    [getTagObjectsForRepo, hiddenRepoIds, repos, searchQuery, sortOrder]
  );

  const categoryCounts = useMemo(
    () => countRepositoryHealth(visibleRepos, classifyOptions),
    [classifyOptions, visibleRepos]
  );

  const getAutoHealth = (repo: Repo) => classifyRepo(repo, classifyOptions);
  const handleCloseDetail = useCallback(() => {
    setSelectedRepo(null);
  }, []);

  const handleToggleTracked = useCallback(
    (repoId: string) => {
      const current = resolveRepositoryMeta(repoId, getMeta(repoId));
      updateMeta(repoId, { tracked: !current.tracked });
    },
    [getMeta, updateMeta]
  );

  const handleShowAll = useCallback(() => setViewMode('all'), [setViewMode]);

  useEffect(() => {
    onStatsUpdate?.(visibleRepos.length, categoryCounts, REPOSITORY_HOME_COLUMN_TITLES);
  }, [categoryCounts, onStatsUpdate, visibleRepos.length]);

  return (
    <div className="h-full overflow-auto bg-surface-app">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-stack-lg px-inset-lg py-inset-lg">
        <header className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm">
          <div className="flex flex-col gap-stack-md lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-[var(--text-muted)]">リポジトリ</p>
              <h1 className="mt-stack-xs text-title-1 font-bold text-[var(--text-primary)]">
                読んで整理する一覧
              </h1>
              <p className="mt-stack-sm max-w-2xl text-body-sm leading-relaxed text-[var(--text-secondary)]">
                カードを押してもGitHubへ移動しません。外部で開くときだけ「GitHubで開く」を使います。
              </p>
            </div>

            <div className="flex flex-col gap-stack-sm sm:flex-row sm:items-center">
              {lastUpdateTime && (
                <span className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-sm py-inset-xs text-caption text-[var(--text-muted)]">
                  最終取得: {formatLastUpdateTime(lastUpdateTime)}
                </span>
              )}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isLoading}
                  className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
                >
                  {isLoading ? '読み込み中…' : '更新'}
                </button>
              )}
              {onOpenAdvancedFeatures && (
                <button
                  type="button"
                  onClick={onOpenAdvancedFeatures}
                  className={`inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] shadow-sm transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
                >
                  高度な機能を見る
                </button>
              )}
            </div>
          </div>

          <div className="mt-stack-lg grid grid-cols-1 gap-stack-sm lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
            <label className="block">
              <span className="sr-only">リポジトリを検索</span>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                  />
                </svg>
                <input
                  type="search"
                  name="repository-search"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="名前、説明、言語、トピックで検索"
                  className={`w-full rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm pl-inset-xl text-body text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
                />
              </div>
            </label>

            <label className="block">
              <span className="sr-only">並び替え</span>
              <select
                value={sortOrder}
                name="repository-sort"
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className={`w-full rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body text-[var(--text-primary)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <span className="sr-only">表示切り替え</span>
              <RepositoryViewSwitcher value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          <div className="mt-stack-md flex flex-wrap items-center gap-inline-sm text-caption text-[var(--text-muted)]">
            <span>
              表示中: {visibleRepos.length} / {repos.length}
            </span>
            {hiddenRepoIds.size > 0 && <span>非表示: {hiddenRepoIds.size}</span>}
            <span aria-hidden>·</span>
            <span>{REPOSITORY_HOME_COLUMN_TITLES.Active}: {categoryCounts.Active}</span>
            <span>{REPOSITORY_HOME_COLUMN_TITLES.Stale}: {categoryCounts.Stale}</span>
            <span>{REPOSITORY_HOME_COLUMN_TITLES.Dormant}: {categoryCounts.Dormant}</span>
            <span>{REPOSITORY_HOME_COLUMN_TITLES.Archived}: {categoryCounts.Archived}</span>
          </div>
        </header>

        <GithubTermHint terms={['repository', 'issue', 'pullRequest']} />

        {viewMode === 'all' ? (
          <RepositoryList
            repos={visibleRepos}
            getAutoHealth={getAutoHealth}
            getUserMeta={getMeta}
            onOpenDetail={setSelectedRepo}
            onToggleTracked={handleToggleTracked}
            isLoading={isLoading}
            hasSearchQuery={searchQuery.trim().length > 0}
          />
        ) : viewMode === 'kanban' ? (
          <RepositoryProgressKanban
            repos={visibleRepos}
            getMeta={getMeta}
            getAutoHealth={getAutoHealth}
            onOpenDetail={setSelectedRepo}
            onToggleTracked={handleToggleTracked}
            onShowAll={handleShowAll}
            isLoading={isLoading}
          />
        ) : (
          <RepositoryProgressRoadmap
            repos={visibleRepos}
            getMeta={getMeta}
            getAutoHealth={getAutoHealth}
            onOpenDetail={setSelectedRepo}
            onToggleTracked={handleToggleTracked}
            onShowAll={handleShowAll}
            isLoading={isLoading}
          />
        )}
      </div>

      {selectedRepo && (
        <RepositoryDetailPanel
          repo={selectedRepo}
          autoHealth={getAutoHealth(selectedRepo)}
          userMeta={getMeta(selectedRepo.id)}
          saveError={repositoryMetaSaveError}
          practiceIssueDrafts={getDraftsForRepo(selectedRepo.id)}
          practicePullRequestDrafts={getPullRequestDraftsForRepo(selectedRepo.id)}
          practiceIssueSaveError={practiceIssueSaveError}
          practiceIssuePublishError={practiceIssuePublishError}
          publishingPracticeIssueDraftId={publishingPracticeIssueDraftId}
          practicePullRequestSaveError={practicePullRequestSaveError}
          onCreatePracticeIssueDraft={(input) => createIssueDraft(selectedRepo.id, input)}
          onCreateGitHubIssueFromDraft={(draftId) => createGitHubIssueFromDraft(selectedRepo.nameWithOwner, draftId)}
          onCreatePracticePullRequestDraft={(input) =>
            createPullRequestDraft(selectedRepo.id, input, getDraftsForRepo(selectedRepo.id))
          }
          onUserMetaChange={updateMeta}
          onOpenPracticeHome={onOpenPracticeHome}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
