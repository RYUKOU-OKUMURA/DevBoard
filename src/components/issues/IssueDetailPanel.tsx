import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { fetchRepoLabels, type GitHubIssue, type GitHubLabel } from '../../api/issues';
import { createPortal } from 'react-dom';
import { useIssueActions, type IssueAction } from '../../hooks/useIssueActions';
import type { TrackedIssueUpdate, TrackedRepoIssueItem } from '../../hooks/useTrackedRepoIssues';
import { focusRing } from '../../lib/focusRing';

interface IssueDetailPanelProps {
  item: TrackedRepoIssueItem;
  onClose: () => void;
  pendingAction: IssueAction | null;
  beginAction: (repoId: string, issueNumber: number, action: IssueAction) => boolean;
  endAction: (repoId: string, issueNumber: number) => void;
  onIssueUpdated: (
    repoId: string,
    issueId: number,
    update: TrackedIssueUpdate,
    fallbackIssue: GitHubIssue
  ) => GitHubIssue | null;
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

export function IssueDetailPanel({
  item,
  onClose,
  pendingAction,
  beginAction,
  endAction,
  onIssueUpdated,
}: IssueDetailPanelProps) {
  const { issue, repo } = item;
  const {
    changeState,
    postComment,
    saveLabels,
    loadLabelsError,
    clearLabelsError,
    error,
    labelsError,
  } =
    useIssueActions({ item, onIssueUpdated, pendingAction, beginAction, endAction });
  const [comment, setComment] = useState('');
  const [isLabelEditorOpen, setIsLabelEditorOpen] = useState(false);
  const [repoLabels, setRepoLabels] = useState<GitHubLabel[]>([]);
  const [labelsLoaded, setLabelsLoaded] = useState(false);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [labelDraft, setLabelDraft] = useState<{ baseline: Set<string>; selected: Set<string> }>({
    baseline: new Set(),
    selected: new Set(),
  });
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const loadLabels = async () => {
    setIsLoadingLabels(true);
    clearLabelsError();
    try {
      const [owner, ...repoParts] = repo.nameWithOwner.split('/');
      const repoName = repoParts.join('/');
      if (!owner || !repoName) throw new Error('Invalid repository nameWithOwner.');
      setRepoLabels(await fetchRepoLabels(owner, repoName));
      setLabelsLoaded(true);
    } catch (loadError) {
      loadLabelsError(loadError);
    } finally {
      setIsLoadingLabels(false);
    }
  };

  const toggleLabelEditor = () => {
    if (isLabelEditorOpen) {
      setIsLabelEditorOpen(false);
      return;
    }
    const currentNames = new Set(issue.labels.map((label) => label.name));
    setLabelDraft({ baseline: currentNames, selected: currentNames });
    setIsLabelEditorOpen(true);
    if (!labelsLoaded) void loadLabels();
  };

  useEffect(() => {
    const latestNames = new Set(issue.labels.map((label) => label.name));
    setLabelDraft((current) => {
      const unchanged = current.baseline.size === current.selected.size &&
        [...current.baseline].every((name) => current.selected.has(name));
      return unchanged ? { baseline: latestNames, selected: latestNames } : current;
    });
  }, [issue.labels]);

  const visibleLabels = Array.from(
    new Map([...issue.labels, ...repoLabels].map((label) => [label.name, label])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const currentLabelNames = new Set(issue.labels.map((label) => label.name));
  const labelsChanged =
    currentLabelNames.size !== labelDraft.selected.size ||
    [...currentLabelNames].some((name) => !labelDraft.selected.has(name));

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
          {error && (
            <p role="alert" className="mt-stack-md rounded-lg border border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] p-inset-md text-body-sm text-[var(--accent-red-emphasis)]">
              {error}
            </p>
          )}
          {labelsError && (
            <p role="alert" className="mt-stack-md rounded-lg border border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] p-inset-md text-body-sm text-[var(--accent-red-emphasis)]">
              {labelsError}
            </p>
          )}
          <section aria-label="Issue操作" className="mt-stack-lg grid gap-stack-md">
            <button
              type="button"
              onClick={() => void changeState()}
              disabled={pendingAction !== null}
              className={`inline-flex w-fit items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
            >
              {pendingAction === 'state'
                ? '処理中…'
                : issue.state === 'open'
                  ? 'このIssueを閉じる（Close）'
                  : 'もう一度開く（Reopen）'}
            </button>

            <div className="grid gap-stack-sm">
              <h3 className="text-body-sm font-semibold text-[var(--text-primary)]">Comment（コメント）</h3>
              <label className="grid gap-stack-xs text-body-sm text-[var(--text-secondary)]">
                コメント本文
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  disabled={pendingAction !== null}
                  className={`w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-surface-primary px-inset-md py-inset-sm text-body-sm text-[var(--text-primary)] transition-colors motion-reduce:transition-none disabled:opacity-70 ${focusRing.default} focus-visible:border-[var(--accent-blue)] focus-visible:ring-[var(--accent-blue)]`}
                />
              </label>
              <button
                type="button"
                onClick={async () => {
                  const updatedIssue = await postComment(comment);
                  if (updatedIssue) setComment('');
                }}
                disabled={pendingAction !== null || !comment.trim()}
                className={`inline-flex w-fit items-center justify-center rounded-lg bg-[var(--accent-blue)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse transition-colors motion-reduce:transition-none hover:bg-[var(--accent-blue-strong)] disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
              >
                {pendingAction === 'comment' ? '投稿中…' : 'コメントを投稿'}
              </button>
            </div>

            <div className="grid gap-stack-sm">
              <div className="flex flex-wrap items-center justify-between gap-inline-sm">
                <h3 className="text-body-sm font-semibold text-[var(--text-primary)]">Label（目印）</h3>
                <button
                  type="button"
                  aria-expanded={isLabelEditorOpen}
                  onClick={toggleLabelEditor}
                  disabled={pendingAction !== null}
                  className={`inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
                >
                  {isLabelEditorOpen ? '編集を閉じる' : 'ラベルを編集'}
                </button>
              </div>
              {isLabelEditorOpen && (
                <div className="grid gap-stack-sm rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
                  {isLoadingLabels ? (
                    <p role="status" className="text-body-sm text-[var(--text-secondary)]">Label（目印）候補を取得中…</p>
                  ) : labelsError && !labelsLoaded ? (
                    <div className="grid gap-stack-sm">
                      <button
                        type="button"
                        onClick={() => void loadLabels()}
                        className={`inline-flex w-fit items-center justify-center rounded-lg border border-[var(--border-strong)] px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
                      >
                        ラベル候補を再取得
                      </button>
                    </div>
                  ) : (
                    <>
                      <fieldset disabled={pendingAction !== null} className="grid gap-stack-xs">
                        <legend className="text-body-sm font-semibold text-[var(--text-primary)]">付けるLabel（目印）を選択</legend>
                        {visibleLabels.length > 0 ? visibleLabels.map((label) => (
                          <label key={label.name} className="flex items-center gap-inline-sm text-body-sm text-[var(--text-secondary)]">
                            <input
                              type="checkbox"
                              checked={labelDraft.selected.has(label.name)}
                              onChange={(event) => setLabelDraft((current) => {
                                const next = new Set(current.selected);
                                if (event.target.checked) next.add(label.name);
                                else next.delete(label.name);
                                return { ...current, selected: next };
                              })}
                              className={`${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
                            />
                            <span>{label.name}</span>
                          </label>
                        )) : <p className="text-body-sm text-[var(--text-secondary)]">選べるLabel（目印）はありません。</p>}
                      </fieldset>
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedIssue = await saveLabels(
                            [...labelDraft.selected],
                            [...labelDraft.baseline]
                          );
                          if (updatedIssue) {
                            const updatedNames = new Set(updatedIssue.labels.map((label) => label.name));
                            setLabelDraft({ baseline: updatedNames, selected: updatedNames });
                          }
                        }}
                        disabled={pendingAction !== null || isLoadingLabels || !labelsLoaded || !labelsChanged}
                        className={`inline-flex w-fit items-center justify-center rounded-lg bg-[var(--accent-blue)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse transition-colors motion-reduce:transition-none hover:bg-[var(--accent-blue-strong)] disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
                      >
                        {pendingAction === 'labels' ? '保存中…' : 'ラベルを保存'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
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
