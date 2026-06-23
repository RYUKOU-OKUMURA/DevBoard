import type { ColumnKey, Repo, RepoUserMeta } from '../../types';
import { RepositoryProgressKanbanColumn } from './RepositoryProgressKanbanColumn';
import {
  KANBAN_STATUS_ORDER,
  groupRepositoriesByStatus,
} from './repositoryProgressModel';

interface RepositoryProgressKanbanProps {
  repos: Repo[];
  getMeta: (repoId: string) => RepoUserMeta | null;
  getAutoHealth: (repo: Repo) => ColumnKey;
  onOpenDetail: (repo: Repo) => void;
  onToggleTracked?: (repoId: string) => void;
  onShowAll?: () => void;
  isLoading?: boolean;
}

function KanbanSkeleton() {
  return (
    <div className="grid min-w-max grid-flow-col auto-cols-[minmax(280px,1fr)] gap-stack-md" aria-label="カンバンを読み込み中">
      {KANBAN_STATUS_ORDER.map((status) => (
        <div
          key={status}
          className="h-72 rounded-lg border border-[var(--border-subtle)] bg-surface-secondary"
        >
          <div className="h-6 w-1/3 animate-pulse rounded bg-surface-hover p-inset-sm motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

function EmptyBoard({ onShowAll }: { onShowAll?: () => void }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl">
      <div className="max-w-md text-center">
        <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">まだ進捗管理対象がありません</h2>
        <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
          リポジトリ一覧（すべて）から「進捗管理に追加」を選んでください。追加したものだけ、このカンバンに並びます。
        </p>
        {onShowAll && (
          <button
            type="button"
            onClick={onShowAll}
            className="mt-stack-md inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent-green)] focus-visible:ring-offset-[var(--bg-secondary)]"
          >
            「すべて」を見る
          </button>
        )}
      </div>
    </div>
  );
}

export function RepositoryProgressKanban({
  repos,
  getMeta,
  getAutoHealth,
  onOpenDetail,
  onToggleTracked,
  onShowAll,
  isLoading = false,
}: RepositoryProgressKanbanProps) {
  if (isLoading) {
    return <KanbanSkeleton />;
  }

  const groups = groupRepositoriesByStatus(repos, getMeta);
  const trackedCount = Object.values(groups).reduce((sum, items) => sum + items.length, 0);

  if (trackedCount === 0) {
    return <EmptyBoard onShowAll={onShowAll} />;
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-max grid-flow-col auto-cols-[minmax(280px,1fr)] gap-stack-md">
        {KANBAN_STATUS_ORDER.map((status) => (
          <RepositoryProgressKanbanColumn
            key={status}
            status={status}
            items={groups[status]}
            getAutoHealth={getAutoHealth}
            onOpenDetail={onOpenDetail}
            onToggleTracked={onToggleTracked}
          />
        ))}
      </div>
    </div>
  );
}
