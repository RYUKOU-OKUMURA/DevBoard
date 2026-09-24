import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TrackedRepoIssueItem } from '../../hooks/useTrackedRepoIssues';
import { focusRing } from '../../lib/focusRing';

interface IssueDetailPanelProps {
  item: TrackedRepoIssueItem;
  onClose: () => void;
}

function formatIssueDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '不明';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-stack-xs border-b border-[var(--border-subtle)] py-inset-sm last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-inline-md">
      <dt className="text-caption font-semibold text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 text-body-sm leading-relaxed text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}

export function IssueDetailPanel({ item, onClose }: IssueDetailPanelProps) {
  const { issue, repo } = item;
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const getFocusableElements = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(selectors) ?? []).filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
      );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panelRef.current?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    closeButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end bg-black/35 backdrop-blur-sm">
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        aria-label="詳細パネルを閉じる"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--border-subtle)] bg-surface-primary shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-inline-md border-b border-[var(--border-subtle)] px-inset-lg py-inset-lg">
          <div className="min-w-0">
            <p className="text-caption font-semibold text-[var(--text-muted)]">Issue（やること）詳細</p>
            <h2 id={titleId} className="mt-stack-xs break-words text-title-2 font-bold text-[var(--text-primary)]">{issue.title}</h2>
            <p className="mt-stack-xs text-body-sm text-[var(--text-secondary)]">{repo.nameWithOwner} · #{issue.number}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="詳細パネルを閉じる"
            onClick={onClose}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-inset-lg py-inset-md">
          <dl>
            <DetailRow label="状態">{issue.state === 'open' ? '未完了（Open）' : '完了（Closed）'}</DetailRow>
            <DetailRow label="Label（目印）">
              {issue.labels.length > 0 ? issue.labels.map((label) => label.name).join('、') : 'なし'}
            </DetailRow>
            <DetailRow label="Assignee（担当者）">
              {issue.assignees.length > 0 ? issue.assignees.map((person) => person.login).join(', ') : 'なし'}
            </DetailRow>
            <DetailRow label="作成日時">{formatIssueDate(issue.created_at)}</DetailRow>
            <DetailRow label="更新日時">{formatIssueDate(issue.updated_at)}</DetailRow>
            <DetailRow label="コメント数">{issue.comments} 件</DetailRow>
          </dl>
          <section className="mt-stack-lg">
            <h3 className="text-body-sm font-semibold text-[var(--text-primary)]">本文</h3>
            <p className="mt-stack-sm min-h-12 whitespace-pre-wrap break-words rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md text-body-sm leading-relaxed text-[var(--text-secondary)]">
              {issue.body || '本文はありません。'}
            </p>
          </section>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-[var(--border-subtle)] px-inset-lg py-inset-md">
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
          >
            GitHubで開く
          </a>
        </footer>
      </aside>
    </div>,
    document.body
  );
}
