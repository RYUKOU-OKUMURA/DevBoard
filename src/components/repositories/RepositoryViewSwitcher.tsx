import type { RepositoryViewMode } from '../../types';
import { focusRing } from '../../lib/focusRing';

interface RepositoryViewSwitcherProps {
  value: RepositoryViewMode;
  onChange: (value: RepositoryViewMode) => void;
}

const VIEW_OPTIONS: Array<{ value: RepositoryViewMode; label: string }> = [
  { value: 'all', label: 'すべて' },
  { value: 'kanban', label: 'カンバン' },
  { value: 'roadmap', label: 'ロードマップ' },
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
            className={`inline-flex items-center justify-center rounded-md px-inset-md py-inset-xs text-body-sm font-semibold transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)] ${
              selected
                ? 'border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)]'
                : 'border border-transparent text-[var(--text-secondary)] hover:bg-surface-hover'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
