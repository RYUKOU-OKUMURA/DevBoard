import type { ColumnKey, Repo, RepoUserStatus } from '../../types';
import { RepositoryProgressCard } from './RepositoryProgressCard';
import { getRepositoryUserStatusLabel } from './repositoryMetaLabels';
import type { RepositoryProgressItem } from './repositoryProgressModel';

interface RepositoryProgressKanbanColumnProps {
  status: RepoUserStatus;
  items: RepositoryProgressItem[];
  getAutoHealth: (repo: Repo) => ColumnKey;
  onOpenDetail: (repo: Repo) => void;
  onToggleTracked?: (repoId: string) => void;
}

export function RepositoryProgressKanbanColumn({
  status,
  items,
  getAutoHealth,
  onOpenDetail,
  onToggleTracked,
}: RepositoryProgressKanbanColumnProps) {
  return (
    <section
      aria-label={`${getRepositoryUserStatusLabel(status)}のプロジェクト`}
      className="flex min-h-[160px] w-full flex-col rounded-lg border border-[var(--border-subtle)] bg-surface-secondary"
    >
      <header className="flex items-center justify-between gap-inline-sm border-b border-[var(--border-subtle)] px-inset-md py-inset-sm">
        <h3 className="text-body-sm font-semibold text-[var(--text-primary)]">
          {getRepositoryUserStatusLabel(status)}
        </h3>
        <span className="rounded-md border border-[var(--border-subtle)] bg-surface-primary px-inset-xs py-inline-xs text-caption font-semibold text-[var(--text-muted)]">
          {items.length}
        </span>
      </header>

      <div className="flex flex-col gap-stack-sm p-inset-sm">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary px-inset-md py-inset-md text-center text-caption text-[var(--text-muted)]">
            この状態のプロジェクトはありません
          </p>
        ) : (
          items.map(({ repo, meta }) => (
            <RepositoryProgressCard
              key={repo.id}
              repo={repo}
              meta={meta}
              autoHealth={getAutoHealth(repo)}
              onOpenDetail={onOpenDetail}
              onToggleTracked={onToggleTracked}
            />
          ))
        )}
      </div>
    </section>
  );
}
