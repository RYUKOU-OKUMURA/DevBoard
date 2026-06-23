import type { ColumnKey, Repo, RepoUserMeta } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { RepositoryHealthBadge } from './RepositoryHealthBadge';
import {
  getRepositoryProjectStageLabel,
  getRepositoryScheduleBucketLabel,
} from './repositoryMetaLabels';

interface RepositoryProgressCardProps {
  repo: Repo;
  meta: RepoUserMeta;
  autoHealth: ColumnKey;
  onOpenDetail: (repo: Repo) => void;
  onToggleTracked?: (repoId: string) => void;
}

function splitNameWithOwner(nameWithOwner: string): { owner: string; name: string } {
  const [owner, ...nameParts] = nameWithOwner.split('/');
  return {
    owner: owner || nameWithOwner,
    name: nameParts.join('/') || nameWithOwner,
  };
}

function formatUpdatedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '不明';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function RepositoryProgressCard({
  repo,
  meta,
  autoHealth,
  onOpenDetail,
  onToggleTracked,
}: RepositoryProgressCardProps) {
  const { owner, name } = splitNameWithOwner(repo.nameWithOwner);
  const nextAction = meta.nextAction.trim();

  return (
    <article className="relative rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-md shadow-sm transition-colors motion-reduce:transition-none hover:border-[var(--accent-green-border)]">
      <button
        type="button"
        onClick={() => onOpenDetail(repo)}
        className={`absolute inset-0 z-10 rounded-lg text-left ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
        aria-label={`${repo.nameWithOwner} の詳細を開く`}
      />

      <div className="relative">
        <div className="min-w-0">
          <p className="break-words text-body-sm font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--accent-green)]">{name}</span>
            <span className="text-[var(--text-muted)]"> / {owner}</span>
          </p>
          {repo.isArchived && (
            <span className="mt-inline-xs inline-flex items-center rounded-md border border-[var(--border-subtle)] bg-surface-secondary px-inset-xs py-inline-xs text-caption text-[var(--text-muted)]">
              Archived
            </span>
          )}
        </div>

        <div className="mt-stack-xs flex flex-wrap gap-inline-xs">
          <span className="inline-flex items-center rounded-md border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inline-xs text-caption font-semibold text-[var(--accent-blue-emphasis)]">
            {getRepositoryProjectStageLabel(meta.stage)}
          </span>
          <span className="inline-flex items-center rounded-md border border-[var(--accent-purple-border)] bg-[var(--accent-purple-muted)] px-inset-sm py-inline-xs text-caption font-semibold text-[var(--accent-purple-emphasis)]">
            {getRepositoryScheduleBucketLabel(meta.scheduleBucket)}
          </span>
        </div>

        <p className="mt-stack-xs min-w-0 text-body-sm leading-relaxed text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-muted)]">次: </span>
          {nextAction || '次にやること未設定'}
        </p>

        <div className="mt-stack-xs flex flex-wrap items-center gap-inline-xs text-caption text-[var(--text-muted)]">
          <RepositoryHealthBadge autoHealth={autoHealth} />
          <span>最終更新 {formatUpdatedDate(repo.pushedAt)}</span>
        </div>

        {onToggleTracked && (
          <button
            type="button"
            onClick={() => onToggleTracked(repo.id)}
            className={`relative z-20 mt-stack-sm inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] bg-surface-secondary px-inset-sm py-inset-xs text-caption font-semibold text-[var(--text-secondary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
          >
            進捗管理から外す
          </button>
        )}
      </div>
    </article>
  );
}
