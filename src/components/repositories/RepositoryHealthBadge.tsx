import type { ColumnKey } from '../../types';

type RepositoryHealthBadgeInfo = {
  label: string;
  className: string;
};

const FALLBACK_HEALTH_BADGE: RepositoryHealthBadgeInfo = {
  label: '長く未更新',
  className:
    'border-[var(--accent-orange-border)] bg-[var(--accent-orange-muted)] text-[var(--accent-orange-emphasis)]',
};

const HEALTH_BADGE_BY_KEY: Record<string, RepositoryHealthBadgeInfo> = {
  Active: {
    label: '最近動きあり',
    className:
      'border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)]',
  },
  Stale: {
    label: '少し停滞',
    className:
      'border-[var(--accent-yellow-border)] bg-[var(--accent-yellow-muted)] text-[var(--accent-yellow-emphasis)]',
  },
  Dormant: {
    label: '長く未更新',
    className:
      'border-[var(--accent-orange-border)] bg-[var(--accent-orange-muted)] text-[var(--accent-orange-emphasis)]',
  },
  Archived: {
    label: 'アーカイブ',
    className: 'border-[var(--border-subtle)] bg-surface-tertiary text-[var(--text-muted)]',
  },
};

interface RepositoryHealthBadgeProps {
  autoHealth: ColumnKey;
}

export function RepositoryHealthBadge({ autoHealth }: RepositoryHealthBadgeProps) {
  const badge = HEALTH_BADGE_BY_KEY[autoHealth] ?? FALLBACK_HEALTH_BADGE;

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-inset-sm py-inline-xs text-caption font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
