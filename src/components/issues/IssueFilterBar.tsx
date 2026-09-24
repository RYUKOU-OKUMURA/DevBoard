import { focusRing } from '../../lib/focusRing';

export type IssueStateFilter = 'all' | 'open' | 'closed';

export interface IssueFilters {
  state: IssueStateFilter;
  repoId: string;
  label: string;
  assignee: string;
}

interface IssueFilterBarProps {
  filters: IssueFilters;
  repoOptions: Array<{ id: string; name: string }>;
  labelOptions: string[];
  assigneeOptions: string[];
  onChange: (filters: IssueFilters) => void;
}

const selectClassName = `w-full rounded-lg border border-[var(--border-subtle)] bg-surface-primary px-inset-md py-inset-sm text-body-sm text-[var(--text-primary)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:ring-[var(--accent-green)]`;

export function IssueFilterBar({
  filters,
  repoOptions,
  labelOptions,
  assigneeOptions,
  onChange,
}: IssueFilterBarProps) {
  return (
    <section aria-label="Issue（やること）の絞り込み" className="grid gap-stack-sm sm:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-stack-xs text-body-sm text-[var(--text-secondary)]">
        状態
        <select
          aria-label="状態で絞り込み"
          className={selectClassName}
          value={filters.state}
          onChange={(event) => onChange({ ...filters, state: event.target.value as IssueStateFilter })}
        >
          <option value="open">未完了（Open）</option>
          <option value="closed">完了（Closed）</option>
          <option value="all">すべて</option>
        </select>
      </label>
      <label className="grid gap-stack-xs text-body-sm text-[var(--text-secondary)]">
        リポジトリ
        <select
          aria-label="リポジトリで絞り込み"
          className={selectClassName}
          value={filters.repoId}
          onChange={(event) => onChange({ ...filters, repoId: event.target.value })}
        >
          <option value="all">すべて</option>
          {repoOptions.map((repo) => (
            <option key={repo.id} value={repo.id}>{repo.name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-stack-xs text-body-sm text-[var(--text-secondary)]">
        Label（目印）
        <select
          aria-label="Label（目印）で絞り込み"
          className={selectClassName}
          value={filters.label}
          onChange={(event) => onChange({ ...filters, label: event.target.value })}
        >
          <option value="all">すべて</option>
          {labelOptions.map((label) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-stack-xs text-body-sm text-[var(--text-secondary)]">
        Assignee（担当者）
        <select
          aria-label="Assignee（担当者）で絞り込み"
          className={selectClassName}
          value={filters.assignee}
          onChange={(event) => onChange({ ...filters, assignee: event.target.value })}
        >
          <option value="all">すべて</option>
          {assigneeOptions.map((assignee) => (
            <option key={assignee} value={assignee}>{assignee}</option>
          ))}
        </select>
      </label>
    </section>
  );
}
