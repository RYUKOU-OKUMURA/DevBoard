import type { ColumnKey, Repo } from '../../types';
import { focusRing } from '../../lib/focusRing';

interface RepositoryCardProps {
  repo: Repo;
  autoHealth: ColumnKey;
}

type AutoHealthBadgeInfo = {
  label: string;
  className: string;
};

const FALLBACK_AUTO_HEALTH_BADGE: AutoHealthBadgeInfo = {
  label: '長く未更新',
  className:
    'bg-[var(--accent-orange-muted)] text-[var(--accent-orange-emphasis)] border-[var(--accent-orange-border)]',
};

const AUTO_HEALTH_LABELS: Record<string, AutoHealthBadgeInfo> = {
  Active: {
    label: '最近動きあり',
    className:
      'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border-[var(--accent-green-border)]',
  },
  Stale: {
    label: '少し停滞',
    className:
      'bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)] border-[var(--accent-yellow-border)]',
  },
  Dormant: {
    label: '長く未更新',
    className:
      'bg-[var(--accent-orange-muted)] text-[var(--accent-orange-emphasis)] border-[var(--accent-orange-border)]',
  },
  Archived: {
    label: 'アーカイブ',
    className: 'bg-surface-tertiary text-[var(--text-muted)] border-[var(--border-subtle)]',
  },
};

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

function AutoHealthBadge({ autoHealth }: { autoHealth: ColumnKey }) {
  const badge = AUTO_HEALTH_LABELS[autoHealth] ?? FALLBACK_AUTO_HEALTH_BADGE;

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-inset-sm py-inline-xs text-caption font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function VisibilityBadge({ repo }: { repo: Repo }) {
  if (repo.isPrivate) {
    return (
      <span className="inline-flex items-center rounded-lg border border-[var(--accent-yellow-border)] bg-[var(--accent-yellow-muted)] px-inset-sm py-inline-xs text-caption font-semibold text-[var(--accent-yellow-emphasis)]">
        非公開
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-lg border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] px-inset-sm py-inline-xs text-caption font-semibold text-[var(--accent-green-emphasis)]">
      公開
    </span>
  );
}

export function RepositoryCard({ repo, autoHealth }: RepositoryCardProps) {
  const { owner, name } = splitNameWithOwner(repo.nameWithOwner);
  const topics = repo.topics.slice(0, 4);
  const remainingTopicCount = repo.topics.length - topics.length;

  return (
    <article className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm transition-colors motion-reduce:transition-none hover:border-[var(--accent-green-border)]">
      <div className="flex flex-col gap-stack-md sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-inline-sm">
            <h2 className="min-w-0 text-title-3 font-semibold text-[var(--text-primary)]">
              <span className="break-words text-[var(--accent-green)]">{name}</span>
              <span className="text-[var(--text-muted)]"> / {owner}</span>
            </h2>
            {repo.isArchived && (
              <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-sm py-inline-xs text-caption font-semibold text-[var(--text-muted)]">
                Archived
              </span>
            )}
          </div>

          <p className="text-body-sm leading-relaxed text-[var(--text-secondary)]">
            {repo.description || '説明はまだありません。あとで目的やメモを足す候補です。'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-inline-sm">
          <AutoHealthBadge autoHealth={autoHealth} />
          <VisibilityBadge repo={repo} />
        </div>
      </div>

      <div className="mt-stack-md flex flex-wrap items-center gap-inline-md text-caption text-[var(--text-muted)]">
        {repo.primaryLanguage && (
          <span className="inline-flex items-center gap-inline-xs font-medium text-[var(--text-secondary)]">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-blue)]" aria-hidden />
            {repo.primaryLanguage}
          </span>
        )}
        <span>最終更新: {formatUpdatedDate(repo.pushedAt)}</span>
        {typeof repo.stargazers_count === 'number' && repo.stargazers_count > 0 && (
          <span>Stars: {repo.stargazers_count.toLocaleString()}</span>
        )}
      </div>

      {(topics.length > 0 || repo.htmlUrl) && (
        <div className="mt-stack-md flex flex-col gap-stack-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-inline-sm">
            {topics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inline-xs text-caption font-medium text-[var(--accent-blue-emphasis)]"
              >
                #{topic}
              </span>
            ))}
            {remainingTopicCount > 0 && (
              <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-sm py-inline-xs text-caption font-medium text-[var(--text-muted)]">
                +{remainingTopicCount}
              </span>
            )}
          </div>

          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-xs text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
            aria-label={`${repo.nameWithOwner} をGitHubで開く`}
          >
            GitHubで開く
          </a>
        </div>
      )}
    </article>
  );
}
