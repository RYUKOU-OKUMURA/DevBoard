import { type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ColumnKey, Repo } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { RepositoryHealthBadge } from './RepositoryHealthBadge';
import { RepositoryStatusBadge } from './RepositoryStatusBadge';

interface RepositoryDetailPanelProps {
  repo: Repo;
  autoHealth: ColumnKey;
  onClose: () => void;
}

function splitNameWithOwner(nameWithOwner: string): { owner: string; name: string } {
  const [owner, ...nameParts] = nameWithOwner.split('/');
  return {
    owner: owner || nameWithOwner,
    name: nameParts.join('/') || nameWithOwner,
  };
}

function formatDetailDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '不明';
  }

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

export function RepositoryDetailPanel({ repo, autoHealth, onClose }: RepositoryDetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const { owner, name } = splitNameWithOwner(repo.nameWithOwner);
  const topics = repo.topics.slice(0, 8);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const getFocusableElements = () => {
      if (!panelRef.current) {
        return [];
      }

      return Array.from(panelRef.current.querySelectorAll<HTMLElement>(selectors)).filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
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
  }, [onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

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
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-[var(--border-subtle)] bg-surface-primary shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-inline-md border-b border-[var(--border-subtle)] px-inset-lg py-inset-lg">
          <div className="min-w-0">
            <p className="text-caption font-semibold text-[var(--text-muted)]">リポジトリ詳細</p>
            <h2 id={titleId} className="mt-stack-xs break-words text-title-2 font-bold text-[var(--text-primary)]">
              {name}
              <span className="font-semibold text-[var(--text-muted)]"> / {owner}</span>
            </h2>
            <p id={descriptionId} className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
              {repo.description || '説明はまだありません。後続フェーズで目的やメモをここに足せます。'}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-surface-secondary text-[var(--text-secondary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover hover:text-[var(--text-primary)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
            aria-label="リポジトリ詳細を閉じる"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-inset-lg py-inset-lg">
          <div className="flex flex-wrap gap-inline-sm">
            <RepositoryHealthBadge autoHealth={autoHealth} />
            <RepositoryStatusBadge status={repo.isPrivate ? 'private' : 'public'} />
            {repo.isArchived && <RepositoryStatusBadge status="archived" />}
          </div>

          <dl className="mt-stack-lg rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-lg py-inset-sm">
            <DetailRow label="URL">
              <span className="break-all font-medium text-[var(--text-secondary)]">{repo.htmlUrl}</span>
            </DetailRow>
            <DetailRow label="最終更新">{formatDetailDate(repo.pushedAt)}</DetailRow>
            <DetailRow label="主な言語">{repo.primaryLanguage || '未設定'}</DetailRow>
            <DetailRow label="公開状態">{repo.isPrivate ? 'Private / 非公開' : 'Public / 公開'}</DetailRow>
            <DetailRow label="Archived">{repo.isArchived ? 'Archived / アーカイブ済み' : '通常のリポジトリ'}</DetailRow>
          </dl>

          {topics.length > 0 && (
            <section className="mt-stack-lg">
              <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">トピック</h3>
              <div className="mt-stack-sm flex flex-wrap gap-inline-sm">
                {topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inline-xs text-caption font-medium text-[var(--accent-blue-emphasis)]"
                  >
                    #{topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mt-stack-lg rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-secondary p-inset-lg">
            <p className="text-caption font-semibold text-[var(--text-muted)]">次のフェーズで使う場所</p>
            <h3 className="mt-stack-xs text-title-3 font-semibold text-[var(--text-primary)]">
              目的・メモ・次にやること
            </h3>
            <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
              ここに自分用の目的、メモ、次にやることを保存できるようにします。今は表示だけの場所です。
            </p>
          </section>

          <section className="mt-stack-md rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-secondary p-inset-lg">
            <p className="text-caption font-semibold text-[var(--text-muted)]">練習モード</p>
            <h3 className="mt-stack-xs text-title-3 font-semibold text-[var(--text-primary)]">
              やることカードを作る
            </h3>
            <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
              後続フェーズで、GitHubに書き込まずにIssue風の下書きを作る導線をここに置きます。
            </p>
          </section>
        </div>

        <footer className="flex shrink-0 flex-col gap-stack-sm border-t border-[var(--border-subtle)] bg-surface-primary px-inset-lg py-inset-md sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-[var(--text-muted)]">外部ページを開く操作は、このボタンだけに限定しています。</p>
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
            aria-label={`${repo.nameWithOwner} をGitHubで開く`}
          >
            GitHubで開く
          </a>
        </footer>
      </aside>
    </div>,
    document.body
  );
}
