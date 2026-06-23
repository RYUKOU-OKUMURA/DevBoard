import type { ColumnKey, Repo, RepoUserMeta } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { RepositoryHealthBadge } from './RepositoryHealthBadge';
import { RepositoryStatusBadge } from './RepositoryStatusBadge';
import {
  getRepositoryProjectStageLabel,
  getRepositoryScheduleBucketLabel,
  getRepositoryUserStatusLabel,
} from './repositoryMetaLabels';

interface RepositoryCardProps {
  repo: Repo;
  autoHealth: ColumnKey;
  userMeta?: RepoUserMeta | null;
  tracked?: boolean;
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

export function RepositoryCard({
  repo,
  autoHealth,
  userMeta,
  tracked,
  onOpenDetail,
  onToggleTracked,
}: RepositoryCardProps) {
  const { owner, name } = splitNameWithOwner(repo.nameWithOwner);
  const topics = repo.topics.slice(0, 4);
  const remainingTopicCount = repo.topics.length - topics.length;
  const hasUserMeta = userMeta !== null && userMeta !== undefined;
  const nextAction = userMeta?.nextAction.trim();
  const isTracked = tracked ?? userMeta?.tracked ?? false;
  const stage = userMeta?.stage;
  const scheduleBucket = userMeta?.scheduleBucket;

  return (
    <article className="relative rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm transition-colors motion-reduce:transition-none hover:border-[var(--accent-green-border)]">
      <button
        type="button"
        onClick={() => onOpenDetail(repo)}
        className={`absolute inset-0 z-10 rounded-lg text-left ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
        aria-label={`${repo.nameWithOwner} の詳細を開く`}
      />

      <div className="relative flex flex-col gap-stack-md sm:flex-row sm:items-start sm:justify-between">
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
          <RepositoryHealthBadge autoHealth={autoHealth} />
          <RepositoryStatusBadge status={repo.isPrivate ? 'private' : 'public'} />
        </div>
      </div>

      <div className="relative mt-stack-md flex flex-wrap items-center gap-inline-md text-caption text-[var(--text-muted)]">
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

      {hasUserMeta && (
        <div className="relative mt-stack-md rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm">
          <div className="flex flex-col gap-stack-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-inline-xs">
              {isTracked && (
                <span className="inline-flex items-center rounded-lg border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] px-inset-sm py-inline-xs text-caption font-semibold text-[var(--accent-green-emphasis)]">
                  進捗管理対象
                </span>
              )}
              <span className="inline-flex w-fit items-center rounded-lg border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] px-inset-sm py-inline-xs text-caption font-semibold text-[var(--accent-green-emphasis)]">
                自分の状態: {getRepositoryUserStatusLabel(userMeta.status)}
              </span>
              {stage && stage !== 'unassigned' && (
                <span className="inline-flex items-center rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inline-xs text-caption font-medium text-[var(--accent-blue-emphasis)]">
                  {getRepositoryProjectStageLabel(stage)}
                </span>
              )}
              {scheduleBucket && scheduleBucket !== 'unscheduled' && (
                <span className="inline-flex items-center rounded-lg border border-[var(--accent-purple-border)] bg-[var(--accent-purple-muted)] px-inset-sm py-inline-xs text-caption font-medium text-[var(--accent-purple-emphasis)]">
                  {getRepositoryScheduleBucketLabel(scheduleBucket)}
                </span>
              )}
            </div>
            {nextAction && (
              <p className="min-w-0 truncate text-body-sm text-[var(--text-secondary)]">
                次にやること: {nextAction}
              </p>
            )}
          </div>
        </div>
      )}

      {onToggleTracked && (
        <div className="relative mt-stack-md flex flex-wrap items-center justify-between gap-inline-sm">
          {!isTracked && (
            <span className="text-caption text-[var(--text-muted)]">
              まだ進捗管理に入っていません
            </span>
          )}
          <button
            type="button"
            onClick={() => onToggleTracked(repo.id)}
            aria-pressed={isTracked}
            className={`inline-flex shrink-0 items-center justify-center rounded-lg px-inset-md py-inset-xs text-body-sm font-semibold shadow-sm transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] ${
              isTracked
                ? 'border border-[var(--border-strong)] bg-surface-secondary text-[var(--text-primary)] hover:bg-surface-hover'
                : 'bg-[var(--accent-green)] text-text-inverse hover:bg-[var(--accent-green-strong)]'
            }`}
          >
            {isTracked ? '進捗管理から外す' : '進捗管理に追加'}
          </button>
        </div>
      )}

      {(topics.length > 0 || repo.htmlUrl) && (
        <div className="relative mt-stack-md flex flex-col gap-stack-sm sm:flex-row sm:items-center sm:justify-between">
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
            className={`relative z-20 inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-xs text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
            aria-label={`${repo.nameWithOwner} をGitHubで開く`}
          >
            GitHubで開く
          </a>
        </div>
      )}
    </article>
  );
}
