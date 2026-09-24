import type { TrackedRepoIssueItem } from '../../hooks/useTrackedRepoIssues';
import { focusRing } from '../../lib/focusRing';
import { formatLastUpdateTime } from '../../utils/timeFormatter';

interface IssueListProps {
  items: TrackedRepoIssueItem[];
  onSelect: (item: TrackedRepoIssueItem) => void;
}

export function IssueList({ items, onSelect }: IssueListProps) {
  return (
    <ul aria-label="Issue（やること）一覧" className="grid list-none gap-stack-sm p-0">
      {items.map(({ repo, issue }) => (
        <li key={`${repo.id}-${issue.id}`}>
          <button
            type="button"
            aria-label={`${repo.nameWithOwner} #${issue.number}: ${issue.title} の詳細を開く`}
            onClick={() => onSelect({ repo, issue })}
            className={`w-full rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-md text-left shadow-sm transition-colors motion-reduce:transition-none hover:border-[var(--accent-blue-border)] hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
          >
            <div className="flex flex-wrap items-center gap-inline-sm text-caption text-[var(--text-muted)]">
              <span>{repo.nameWithOwner}</span>
              <span aria-hidden="true">·</span>
              <span>#{issue.number}</span>
              <span className="rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-inline-sm py-inline-xs text-caption font-semibold text-[var(--text-secondary)]">
                {issue.state === 'open' ? '未完了（Open）' : '完了（Closed）'}
              </span>
            </div>
            <h2 className="mt-stack-sm break-words text-title-3 font-semibold text-[var(--text-primary)]">
              {issue.title}
            </h2>
            <div className="mt-stack-sm flex flex-wrap items-center gap-inline-sm text-caption text-[var(--text-secondary)]">
              <span>Label（目印）:</span>
              {issue.labels.length > 0 ? issue.labels.map((label) => (
                <span key={label.id} className="rounded-full bg-surface-secondary px-inline-sm py-inline-xs">{label.name}</span>
              )) : <span>なし</span>}
            </div>
            <div className="mt-stack-xs flex flex-wrap items-center justify-between gap-inline-sm text-caption text-[var(--text-muted)]">
              <span>Assignee（担当者）: {issue.assignees.length > 0 ? issue.assignees.map((person) => person.login).join(', ') : 'なし'}</span>
              <time dateTime={issue.updated_at}>更新 {formatLastUpdateTime(new Date(issue.updated_at).getTime())}</time>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
