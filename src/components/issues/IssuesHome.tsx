import { useMemo, useState } from 'react';
import type { Repo } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { formatLastUpdateTime } from '../../utils/timeFormatter';
import { useTrackedRepoIssues, type TrackedRepoIssueItem } from '../../hooks/useTrackedRepoIssues';
import { GithubTermHint } from '../practice/GithubTermHint';
import { IssueDetailPanel } from './IssueDetailPanel';
import { IssueFilterBar, type IssueFilters } from './IssueFilterBar';
import { IssueList } from './IssueList';

interface IssuesHomeProps {
  accountId: string;
  repos: Repo[];
  onOpenRepositories: () => void;
}

const INITIAL_FILTERS: IssueFilters = {
  state: 'open',
  repoId: 'all',
  label: 'all',
  assignee: 'all',
};

export function IssuesHome({ accountId, repos, onOpenRepositories }: IssuesHomeProps) {
  const { items, errorsByRepoId, isLoading, lastFetchedAt, reload, trackedCount } =
    useTrackedRepoIssues(accountId, repos);
  const [filters, setFilters] = useState<IssueFilters>(INITIAL_FILTERS);
  const [selectedItem, setSelectedItem] = useState<TrackedRepoIssueItem | null>(null);

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
    const matches = items.filter(({ repo, issue }) =>
      (filters.state === 'all' || issue.state === filters.state) &&
      (filters.repoId === 'all' || repo.id === filters.repoId) &&
      (filters.label === 'all' || issue.labels.some((label) => label.name === filters.label)) &&
      (filters.assignee === 'all' || issue.assignees.some((person) => person.login === filters.assignee))
    );
    return matches.sort(
      (a, b) => new Date(b.issue.updated_at).getTime() - new Date(a.issue.updated_at).getTime()
    );
  }, [filters, items]);

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
            <p className="text-caption text-[var(--text-muted)]" aria-live="polite">{filteredItems.length} 件のIssue</p>
            <IssueList items={filteredItems} onSelect={setSelectedItem} />
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
      {selectedItem && <IssueDetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );
}
