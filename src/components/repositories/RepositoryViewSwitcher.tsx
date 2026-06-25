import type { ReactNode } from 'react';
import type { RepositoryViewMode } from '../../types';
import { focusRing } from '../../lib/focusRing';

interface RepositoryViewSwitcherProps {
  value: RepositoryViewMode;
  onChange: (value: RepositoryViewMode) => void;
}

interface ViewOption {
  value: RepositoryViewMode;
  label: string;
  icon: ReactNode;
}

const LIST_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const KANBAN_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="6" height="14" rx="1" />
    <rect x="10" y="3" width="6" height="9" rx="1" />
    <rect x="17" y="3" width="4" height="11" rx="1" />
  </svg>
);

const ROADMAP_ICON = (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const VIEW_OPTIONS: ViewOption[] = [
  { value: 'all', label: 'すべて', icon: LIST_ICON },
  { value: 'kanban', label: 'カンバン', icon: KANBAN_ICON },
  { value: 'roadmap', label: 'ロードマップ', icon: ROADMAP_ICON },
];

export function RepositoryViewSwitcher({ value, onChange }: RepositoryViewSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="リポジトリの表示モード"
      className="inline-flex flex-wrap items-center gap-inline-xs rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inline-xs"
    >
      {VIEW_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center justify-center gap-inline-sm rounded-md px-inset-md py-inset-sm text-body-sm font-semibold transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] ${
              selected
                ? 'border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)]'
                : 'border border-transparent text-[var(--text-secondary)] hover:bg-surface-hover'
            }`}
          >
            <span className="shrink-0">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
