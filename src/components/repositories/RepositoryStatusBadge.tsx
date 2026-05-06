export type RepositoryStatus = 'public' | 'private' | 'archived';

type RepositoryStatusBadgeInfo = {
  label: string;
  className: string;
};

const STATUS_BADGE_BY_KEY: Record<RepositoryStatus, RepositoryStatusBadgeInfo> = {
  public: {
    label: 'Public / 公開',
    className:
      'border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)]',
  },
  private: {
    label: 'Private / 非公開',
    className:
      'border-[var(--accent-yellow-border)] bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)]',
  },
  archived: {
    label: 'Archived / アーカイブ',
    className: 'border-[var(--border-subtle)] bg-surface-secondary text-[var(--text-muted)]',
  },
};

interface RepositoryStatusBadgeProps {
  status: RepositoryStatus;
}

export function RepositoryStatusBadge({ status }: RepositoryStatusBadgeProps) {
  const badge = STATUS_BADGE_BY_KEY[status];

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-inset-sm py-inline-xs text-caption font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
