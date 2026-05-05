import type { ColumnKey, Repo, RepoUserMeta } from '../../types';
import { RepositoryCard } from './RepositoryCard';

interface RepositoryListProps {
  repos: Repo[];
  getAutoHealth: (repo: Repo) => ColumnKey;
  getUserMeta?: (repoId: string) => RepoUserMeta | null;
  onOpenDetail: (repo: Repo) => void;
  isLoading?: boolean;
  hasSearchQuery?: boolean;
}

function RepositoryListSkeleton() {
  return (
    <div className="space-y-3" aria-label="リポジトリを読み込み中">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-40 rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg"
        >
          <div className="h-5 w-2/5 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
          <div className="mt-stack-md h-4 w-4/5 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
          <div className="mt-stack-sm h-4 w-3/5 animate-pulse rounded bg-surface-hover motion-reduce:animate-none" />
          <div className="mt-stack-lg flex gap-inline-sm">
            <div className="h-6 w-20 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
            <div className="h-6 w-24 animate-pulse rounded-lg bg-surface-hover motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasSearchQuery }: { hasSearchQuery: boolean }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl">
      <div className="max-w-md text-center">
        <div
          className="mx-auto mb-stack-md flex h-14 w-14 items-center justify-center rounded-lg bg-surface-secondary text-[var(--text-muted)]"
          aria-hidden
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">
          {hasSearchQuery ? '一致するリポジトリがありません' : 'まだリポジトリがありません'}
        </h2>
        <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
          {hasSearchQuery
            ? '検索語を変えると見つかるかもしれません。名前、説明、言語、トピックから探せます。'
            : '右上の「リポジトリ追加」または更新から、整理したいリポジトリを表示できます。'}
        </p>
      </div>
    </div>
  );
}

export function RepositoryList({
  repos,
  getAutoHealth,
  getUserMeta,
  onOpenDetail,
  isLoading = false,
  hasSearchQuery = false,
}: RepositoryListProps) {
  if (isLoading) {
    return <RepositoryListSkeleton />;
  }

  if (repos.length === 0) {
    return <EmptyState hasSearchQuery={hasSearchQuery} />;
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {repos.map((repo) => (
        <RepositoryCard
          key={repo.id}
          repo={repo}
          autoHealth={getAutoHealth(repo)}
          userMeta={getUserMeta?.(repo.id)}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}
