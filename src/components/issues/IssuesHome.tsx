import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PracticeIssueDraft, Repo } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { formatLastUpdateTime } from '../../utils/timeFormatter';
import { useIssueLocalMeta } from '../../hooks/useIssueLocalMeta';
import { changeIssueState } from '../../hooks/useIssueActions';
import {
  beginTrackedIssueAction,
  endTrackedIssueAction,
  useTrackedIssueAction,
  useTrackedRepoIssues,
  type IssueAction,
  type TrackedIssueUpdate,
  type TrackedRepoIssueItem,
} from '../../hooks/useTrackedRepoIssues';
import { GithubTermHint } from '../practice/GithubTermHint';
import { IssueDetailPanel } from './IssueDetailPanel';
import { IssueFilterBar, type IssueFilters } from './IssueFilterBar';
import { IssueKanban } from './IssueKanban';
import { getKanbanColumn, type KanbanColumn } from './kanbanColumn';
import { IssueList } from './IssueList';
import { LegacyTodoSection } from './LegacyTodoSection';
import { useLegacyTodoConversion } from '../../hooks/useLegacyTodoConversion';
import { resolveRepositoryMeta } from '../repositories/repositoryProgressModel';
import { getRepositoryMetaMap } from '../../storage/repositoryMetaStorage';
import { getPracticeIssueDrafts } from '../../storage/practiceStorage';

type FocusIssueTarget = { repoId: string; issueNumber: number };

interface IssuesHomeProps {
  accountId: string;
  repos: Repo[];
  onOpenRepositories: () => void;
  focusIssue?: FocusIssueTarget | null;
  onFocusIssueHandled?: () => void;
  onOpenPracticeDraft?: (draftId: string) => void;
}

const INITIAL_FILTERS: IssueFilters = {
  state: 'open',
  repoId: 'all',
  label: 'all',
  assignee: 'all',
  priority: 'all',
};

type IssueViewMode = 'list' | 'repo' | 'kanban';

const VIEW_OPTIONS: { value: IssueViewMode; label: string }[] = [
  { value: 'list', label: 'リスト' },
  { value: 'repo', label: 'リポジトリ別' },
  { value: 'kanban', label: 'カンバン' },
];

export function IssuesHome({
  accountId,
  repos,
  onOpenRepositories,
  focusIssue = null,
  onFocusIssueHandled,
  onOpenPracticeDraft,
}: IssuesHomeProps) {
  const { items, errorsByRepoId, isLoading, lastFetchedAt, reload, replaceIssue, trackedCount } =
    useTrackedRepoIssues(accountId, repos);
  const { getMeta, updateMeta, reloadMeta, saveError: localMetaSaveError } = useIssueLocalMeta(accountId);
  const [filters, setFilters] = useState<IssueFilters>(INITIAL_FILTERS);
  const [viewMode, setViewMode] = useState<IssueViewMode>('list');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<{ repoId: string; issueNumber: number } | null>(null);
  const [focusIssueNotice, setFocusIssueNotice] = useState<string | null>(null);
  const selectedItem = selectedIssue
    ? items.find(({ repo, issue }) => repo.id === selectedIssue.repoId && issue.number === selectedIssue.issueNumber)
    : undefined;
  const pendingAction = useTrackedIssueAction(
    accountId,
    selectedIssue?.repoId ?? '',
    selectedIssue?.issueNumber ?? 0
  );
  const beginAction = useCallback((repoId: string, issueNumber: number, action: IssueAction) => {
    return beginTrackedIssueAction(accountId, repoId, issueNumber, action);
  }, [accountId]);
  const endAction = useCallback((repoId: string, issueNumber: number) => {
    endTrackedIssueAction(accountId, repoId, issueNumber);
  }, [accountId]);
  const handleIssueUpdated = useCallback((
    repoId: string,
    issueId: number,
    update: TrackedIssueUpdate,
    fallbackIssue: TrackedRepoIssueItem['issue']
  ) => {
    return replaceIssue(repoId, issueId, update, fallbackIssue);
  }, [replaceIssue]);
  const handleIssueUpsert = useCallback((repoId: string, issue: TrackedRepoIssueItem['issue']) => {
    reloadMeta();
    replaceIssue(repoId, issue.id, issue, issue);
  }, [reloadMeta, replaceIssue]);
  const isRepoTracked = useCallback((repoId: string) => {
    const meta = getRepositoryMetaMap(accountId)[repoId] ?? null;
    return resolveRepositoryMeta(repoId, meta).tracked;
  }, [accountId]);
  const {
    unlinkedTodos,
    isConverting,
    errorsByTodoId,
    convertedByTodoId,
    successNotice,
    convertTodo,
    getRepo,
  } = useLegacyTodoConversion(accountId, repos, {
    isRepoTracked,
    onIssueUpsert: handleIssueUpsert,
  });

  const repoOptions = useMemo(() => {
    const byId = new Map(items.map(({ repo }) => [repo.id, repo.nameWithOwner]));
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);
  const labelOptions = useMemo(
    () => Array.from(new Set(items.flatMap(({ issue }) => issue.labels.map((label) => label.name))).values()).sort(),
    [items]
  );
  const assigneeOptions = useMemo(
    () => Array.from(new Set(items.flatMap(({ issue }) => issue.assignees.map((person) => person.login))).values()).sort(),
    [items]
  );
  const filteredItems = useMemo(() => {
    const matches = items.filter(({ repo, issue }) => {
      const meta = getMeta(repo.id, issue.number);
      return (
        (viewMode === 'kanban' || filters.state === 'all' || issue.state === filters.state) &&
        (filters.repoId === 'all' || repo.id === filters.repoId) &&
        (filters.label === 'all' || issue.labels.some((label) => label.name === filters.label)) &&
        (filters.assignee === 'all' || issue.assignees.some((person) => person.login === filters.assignee)) &&
        (filters.priority === 'all' ||
          (filters.priority === 'unset' ? !meta?.priority : meta?.priority === filters.priority))
      );
    });
    return matches.sort(
      (a, b) => new Date(b.issue.updated_at).getTime() - new Date(a.issue.updated_at).getTime()
    );
  }, [filters, getMeta, items, viewMode]);
  const repoGroups = useMemo(() => {
    const groups = new Map<string, { repo: TrackedRepoIssueItem['repo']; items: TrackedRepoIssueItem[] }>();
    for (const item of filteredItems) {
      const group = groups.get(item.repo.id);
      if (group) group.items.push(item);
      else groups.set(item.repo.id, { repo: item.repo, items: [item] });
    }
    return Array.from(groups.values());
  }, [filteredItems]);
  const handleSelect = ({ repo, issue }: TrackedRepoIssueItem) =>
    setSelectedIssue({ repoId: repo.id, issueNumber: issue.number });

  const focusReloadAttemptedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusIssue) {
      focusReloadAttemptedKeyRef.current = null;
      return;
    }
    if (isLoading) return;

    const focusKey = `${focusIssue.repoId}:${focusIssue.issueNumber}`;
    const match = items.find(
      ({ repo, issue }) => repo.id === focusIssue.repoId && issue.number === focusIssue.issueNumber
    );
    if (match) {
      setFocusIssueNotice(null);
      setSelectedIssue({ repoId: focusIssue.repoId, issueNumber: focusIssue.issueNumber });
      focusReloadAttemptedKeyRef.current = null;
      onFocusIssueHandled?.();
      return;
    }

    if (focusReloadAttemptedKeyRef.current !== focusKey) {
      focusReloadAttemptedKeyRef.current = focusKey;
      if (isRepoTracked(focusIssue.repoId)) {
        reload();
        return;
      }
    }

    setFocusIssueNotice(
      isRepoTracked(focusIssue.repoId)
        ? 'このIssueは一覧の取得範囲に無いか、まだ反映されていません。「再読み込み」をお試しください。'
        : 'このIssueは一覧にありません。リポジトリを進捗管理に追加すると表示されます。'
    );
    focusReloadAttemptedKeyRef.current = null;
    onFocusIssueHandled?.();
  }, [focusIssue, isLoading, items, isRepoTracked, onFocusIssueHandled, reload]);

  const linkedPracticeDraft = useMemo((): PracticeIssueDraft | null => {
    if (!selectedIssue) return null;
    return (
      getPracticeIssueDrafts(accountId).find(
        (draft) =>
          draft.repoId === selectedIssue.repoId && draft.githubIssueNumber === selectedIssue.issueNumber
      ) ?? null
    );
  }, [accountId, selectedIssue]);

  const handleMove = async (item: TrackedRepoIssueItem, to: KanbanColumn) => {
    const { repo, issue } = item;
    const from = getKanbanColumn(issue.state, getMeta(repo.id, issue.number));
    if (from === to) return;
    if (from === 'done' || to === 'done') {
      const result = await changeIssueState(
        { item, beginAction, endAction, onIssueUpdated: handleIssueUpdated },
        to === 'done' ? 'closed' : 'open'
      );
      setMoveError(result.error);
      if (!result.issue) return;
    }
    updateMeta(repo.id, issue.number, { inProgress: to === 'doing' });
  };

  return (
    <div className="h-full overflow-auto bg-surface-app">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-stack-md px-inset-lg py-inset-md">
        <header className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-md shadow-sm">
          <div className="flex flex-col gap-stack-sm lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-[var(--text-muted)]">Issue（やること）</p>
              <h1 className="mt-stack-xs text-title-2 font-bold text-[var(--text-primary)]">進捗管理中のIssue一覧</h1>
              <p className="mt-stack-xs max-w-2xl text-body-sm leading-relaxed text-[var(--text-secondary)]">
                進捗管理に追加したリポジトリのIssueをまとめて確認できます。カードを押すと詳細が開きます。
              </p>
            </div>
            <div className="flex flex-col gap-stack-xs sm:flex-row sm:items-center">
              <span className="text-caption text-[var(--text-muted)]" aria-live="polite">
                最終取得: {lastFetchedAt === null ? 'まだありません' : formatLastUpdateTime(lastFetchedAt)}
              </span>
              <button
                type="button"
                onClick={reload}
                disabled={isLoading}
                className={`inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
              >
                {isLoading ? '取得中…' : '再読み込み'}
              </button>
            </div>
          </div>
          <div className="mt-stack-md">
            <IssueFilterBar
              filters={filters}
              repoOptions={repoOptions}
              labelOptions={labelOptions}
              assigneeOptions={assigneeOptions}
              onChange={setFilters}
            />
          </div>
        </header>

        {focusIssueNotice && (
          <p role="status" className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-md text-body-sm text-[var(--text-secondary)]">
            {focusIssueNotice}
          </p>
        )}

        <LegacyTodoSection
          todos={unlinkedTodos}
          isConverting={isConverting}
          errorsByTodoId={errorsByTodoId}
          convertedByTodoId={convertedByTodoId}
          successNotice={successNotice}
          getRepoName={(repoId) => getRepo(repoId)?.nameWithOwner}
          onConvert={(todo) => void convertTodo(todo)}
        />

        {Object.entries(errorsByRepoId).length > 0 && (
          <section role="alert" aria-label="リポジトリごとの取得エラー" className="rounded-lg border border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] p-inset-md text-body-sm text-[var(--accent-red-emphasis)]">
            {Object.entries(errorsByRepoId).map(([repoId, error]) => <p key={repoId}>{error}</p>)}
          </section>
        )}

        {trackedCount === 0 ? (
          <section className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl">
            <div className="max-w-md text-center">
              <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">表示するIssueはまだありません</h2>
              <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
                リポジトリ画面で「進捗管理に追加」するとここに出ます。
              </p>
              <button
                type="button"
                onClick={onOpenRepositories}
                className={`mt-stack-md inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
              >
                リポジトリ画面へ
              </button>
            </div>
          </section>
        ) : isLoading && items.length === 0 ? (
          <p className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg text-body-sm text-[var(--text-secondary)]" role="status">
            Issueを読み込んでいます…
          </p>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-inline-sm">
              <p className="text-caption text-[var(--text-muted)]" aria-live="polite">{filteredItems.length} 件のIssue</p>
              <div
                role="group"
                aria-label="Issueの表示モード"
                className="inline-flex items-center gap-inline-xs rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inline-xs"
              >
                {VIEW_OPTIONS.map((option) => {
                  const selected = option.value === viewMode;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setViewMode(option.value)}
                      className={`rounded-md px-inset-md py-inset-xs text-body-sm font-semibold transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] ${
                        selected
                          ? 'border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)]'
                          : 'border border-transparent text-[var(--text-secondary)] hover:bg-surface-hover'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {viewMode === 'kanban' ? (
              <>
                <p className="text-caption text-[var(--text-muted)]">
                  カードはドラッグかボタンで移動できます。「完了」への出し入れはGitHubでIssueを閉じる / 再オープンします（確認あり）。カンバンでは状態の絞り込みは使いません。
                </p>
                {moveError && (
                  <p role="alert" className="rounded-lg border border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] p-inset-md text-body-sm text-[var(--accent-red-emphasis)]">
                    {moveError}
                  </p>
                )}
                <IssueKanban items={filteredItems} getMeta={getMeta} onSelect={handleSelect} onMove={(item, to) => void handleMove(item, to)} />
              </>
            ) : viewMode === 'list' ? (
              <IssueList items={filteredItems} getMeta={getMeta} onSelect={handleSelect} />
            ) : (
              repoGroups.map(({ repo, items: groupItems }) => {
                const repoName = repo.nameWithOwner;
                return (
                  <section key={repo.id} aria-label={`${repoName} のIssue`} className="flex flex-col gap-stack-sm">
                    <h2 className="flex items-baseline gap-inline-sm text-body font-semibold text-[var(--text-primary)]">
                      <span className="break-all">{repoName}</span>
                      <span className="text-caption font-normal text-[var(--text-muted)]">{groupItems.length} 件</span>
                    </h2>
                    <IssueList
                      items={groupItems}
                      getMeta={getMeta}
                      onSelect={handleSelect}
                      label={`${repoName} のIssue一覧`}
                      showRepoName={false}
                    />
                  </section>
                );
              })
            )}
          </>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl text-center text-body-sm text-[var(--text-secondary)]">
            {Object.keys(errorsByRepoId).length > 0
              ? 'Issueを読み込めませんでした。再読み込みをお試しください。'
              : '対象リポジトリにIssueはありません。'}
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl text-center text-body-sm text-[var(--text-secondary)]">
            絞り込み条件に一致するIssueはありません。
          </p>
        )}

        <GithubTermHint terms={['issue']} />
      </div>
      {selectedItem && (
        <IssueDetailPanel
          key={`${accountId}:${selectedItem.repo.id}#${selectedItem.issue.number}`}
          item={selectedItem}
          onClose={() => setSelectedIssue(null)}
          pendingAction={pendingAction}
          beginAction={beginAction}
          endAction={endAction}
          localMeta={getMeta(selectedItem.repo.id, selectedItem.issue.number)}
          localMetaSaveError={localMetaSaveError}
          onSaveLocalMeta={(patch) => updateMeta(selectedItem.repo.id, selectedItem.issue.number, patch)}
          onIssueUpdated={handleIssueUpdated}
          linkedPracticeDraft={linkedPracticeDraft}
          onOpenPracticeDraft={
            linkedPracticeDraft && onOpenPracticeDraft
              ? () => {
                  setSelectedIssue(null);
                  onOpenPracticeDraft(linkedPracticeDraft.id);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
