import type { ColumnKey, Repo } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { RepositoryHealthBadge } from './RepositoryHealthBadge';
import {
  getRepositoryProjectStageLabel,
  getRepositoryUserStatusLabel,
} from './repositoryMetaLabels';
import { ROADMAP_BUCKET_ORDER } from './repositoryProgressModel';
import type { RepositoryProgressItem } from './repositoryProgressModel';

interface RepositoryProgressRoadmapRowProps {
  item: RepositoryProgressItem;
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

export function RepositoryProgressRoadmapRow({
  item,
  autoHealth,
  onOpenDetail,
  onToggleTracked,
}: RepositoryProgressRoadmapRowProps) {
  const { repo, meta } = item;
  const { owner, name } = splitNameWithOwner(repo.nameWithOwner);
  const nextAction = meta.nextAction.trim();

  return (
    <div className="contents">
      <div className="sticky left-0 z-10 flex flex-col gap-inline-xs border-b border-l border-[var(--border-subtle)] bg-surface-primary p-inset-sm">
        <button
          type="button"
          onClick={() => onOpenDetail(repo)}
          className={`self-start break-all text-left text-body-sm font-semibold text-[var(--text-primary)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
        >
          <span className="text-[var(--accent-green)]">{name}</span>
          <span className="text-[var(--text-muted)]"> / {owner}</span>
        </button>
        <div className="flex flex-wrap items-center gap-inline-xs text-caption text-[var(--text-muted)]">
          <span>状態: {getRepositoryUserStatusLabel(meta.status)}</span>
          <span aria-hidden>·</span>
          <RepositoryHealthBadge autoHealth={autoHealth} />
        </div>
        <span className="text-caption text-[var(--text-muted)]">最終更新 {formatUpdatedDate(repo.pushedAt)}</span>
        {onToggleTracked && (
          <button
            type="button"
            onClick={() => onToggleTracked(repo.id)}
            className={`self-start rounded-md border border-[var(--border-subtle)] bg-surface-secondary px-inset-xs py-inline-xs text-caption font-semibold text-[var(--text-secondary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
          >
            進捗管理から外す
          </button>
        )}
      </div>

      {ROADMAP_BUCKET_ORDER.map((bucket) => (
        <div
          key={bucket}
          className="border-b border-l border-[var(--border-subtle)] bg-surface-primary p-inset-sm"
        >
          {meta.scheduleBucket === bucket && (
            <button
              type="button"
              onClick={() => onOpenDetail(repo)}
              className={`flex w-full flex-col gap-inline-xs rounded-lg border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] px-inset-sm py-inset-xs text-left transition-colors motion-reduce:transition-none hover:border-[var(--accent-green)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
              aria-label={`${repo.nameWithOwner} の詳細を開く`}
            >
              <span className="text-caption font-semibold text-[var(--accent-green-emphasis)]">
                {getRepositoryProjectStageLabel(meta.stage)}
              </span>
              <span className="break-words text-body-sm leading-snug text-[var(--text-primary)]">
                {nextAction || '次にやること未設定'}
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
