import { type FormEvent, useMemo, useState } from 'react';
import type { PracticeIssueDraft } from '../../types';
import { focusRing } from '../../lib/focusRing';
import { getGitHubTerms } from '../../lib/githubTerms';
import { generatePracticePullRequestMarkdown, parsePracticeList } from '../../lib/practiceTemplates';

interface PullRequestPracticeWizardInput {
  title: string;
  changedItems: string[];
  reviewPoints: string[];
  relatedIssueDraftId?: string | null;
}

interface PullRequestPracticeWizardProps {
  repoNameWithOwner: string;
  issueDrafts: PracticeIssueDraft[];
  saveError?: string | null;
  onCancel: () => void;
  onSave: (input: PullRequestPracticeWizardInput) => boolean;
}

export function PullRequestPracticeWizard({
  repoNameWithOwner,
  issueDrafts,
  saveError,
  onCancel,
  onSave,
}: PullRequestPracticeWizardProps) {
  const [title, setTitle] = useState('');
  const [changedItemsText, setChangedItemsText] = useState('');
  const [reviewPointsText, setReviewPointsText] = useState('');
  const [relatedIssueDraftId, setRelatedIssueDraftId] = useState('');

  const changedItems = useMemo(() => parsePracticeList(changedItemsText), [changedItemsText]);
  const reviewPoints = useMemo(() => parsePracticeList(reviewPointsText), [reviewPointsText]);
  const terms = useMemo(() => getGitHubTerms(['branch', 'merge']), []);
  const relatedIssueTitle = useMemo(
    () => issueDrafts.find((draft) => draft.id === relatedIssueDraftId)?.title ?? null,
    [issueDrafts, relatedIssueDraftId]
  );
  const generatedMarkdown = useMemo(
    () =>
      generatePracticePullRequestMarkdown({
        title,
        changedItems,
        reviewPoints,
        relatedIssueTitle,
      }),
    [changedItems, relatedIssueTitle, reviewPoints, title]
  );
  const canSave = title.trim().length > 0 && changedItems.length > 0 && reviewPoints.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    const saved = onSave({
      title,
      changedItems,
      reviewPoints,
      relatedIssueDraftId: relatedIssueDraftId || null,
    });
    if (saved) {
      setTitle('');
      setChangedItemsText('');
      setReviewPointsText('');
      setRelatedIssueDraftId('');
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-stack-md rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-md"
    >
      <div className="flex flex-col gap-stack-xs sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption font-semibold text-[var(--text-muted)]">
            GitHub Pull Request / 変更の確認リクエスト練習
          </p>
          <h4 className="mt-stack-xs text-title-3 font-semibold text-[var(--text-primary)]">
            {repoNameWithOwner} の下書き
          </h4>
        </div>
        <span className="rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--accent-blue-emphasis)]">
          DevBoard内だけに保存
        </span>
      </div>

      <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
        GitHubにはPR、ブランチ、コミットを作りません。変更したことと見てほしいことをPR風のMarkdownへ整えます。
      </p>

      {saveError && (
        <p
          role="alert"
          className="mt-stack-sm rounded-lg border border-[var(--accent-red-border)] bg-[var(--accent-red-muted)] px-inset-md py-inset-sm text-body-sm font-medium text-[var(--accent-red-emphasis)]"
        >
          {saveError}
        </p>
      )}

      <div className="mt-stack-md grid gap-stack-md">
        <label className="grid gap-stack-xs">
          <span className="text-caption font-semibold text-[var(--text-muted)]">PRタイトル</span>
          <input
            type="text"
            name="practice-pr-title"
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: READMEに起動手順を追加する"
            className={`w-full rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          />
        </label>

        <label className="grid gap-stack-xs">
          <span className="text-caption font-semibold text-[var(--text-muted)]">関連するやることカード</span>
          <select
            name="practice-pr-related-issue"
            autoComplete="off"
            value={relatedIssueDraftId}
            onChange={(event) => setRelatedIssueDraftId(event.target.value)}
            className={`w-full rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm text-[var(--text-primary)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          >
            <option value="">選択しない</option>
            {issueDrafts.map((draft) => (
              <option key={draft.id} value={draft.id}>
                {draft.title || '無題のやることカード'}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-stack-xs">
          <span className="text-caption font-semibold text-[var(--text-muted)]">変更したこと</span>
          <textarea
            name="practice-pr-changed-items"
            autoComplete="off"
            value={changedItemsText}
            onChange={(event) => setChangedItemsText(event.target.value)}
            rows={4}
            placeholder={`例:\nREADMEに起動手順を追加した\n必要な環境変数を追記した`}
            className={`min-h-28 w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          />
        </label>

        <label className="grid gap-stack-xs">
          <span className="text-caption font-semibold text-[var(--text-muted)]">見てほしいこと</span>
          <textarea
            name="practice-pr-review-points"
            autoComplete="off"
            value={reviewPointsText}
            onChange={(event) => setReviewPointsText(event.target.value)}
            rows={4}
            placeholder={`例:\n手順が初めての人にも分かるか\nリンク切れがないか`}
            className={`min-h-28 w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          />
        </label>

        <section aria-label="BranchとMergeの短い説明" className="border-t border-[var(--border-subtle)] pt-inset-md">
          <h5 className="text-caption font-semibold text-[var(--text-muted)]">Branch / Merge の補足</h5>
          <div className="mt-stack-sm grid gap-stack-sm sm:grid-cols-2">
            {terms.map((term) => (
              <div key={term.key}>
                <p className="text-body-sm font-semibold text-[var(--text-primary)]">
                  {term.label}
                  <span className="ml-inline-xs text-caption text-[var(--accent-blue-emphasis)]">
                    {term.beginnerLabel}
                  </span>
                </p>
                <p className="mt-stack-xs text-body-sm leading-relaxed text-[var(--text-secondary)]">
                  {term.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="PR説明文Markdownプレビュー" className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
          <div className="flex items-center justify-between gap-inline-md">
            <h5 className="text-caption font-semibold text-[var(--text-muted)]">Markdownプレビュー</h5>
            <span className="text-caption text-[var(--text-muted)]">GitHubへは送信しません</span>
          </div>
          <pre className="mt-stack-sm max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-primary p-inset-md text-body-sm leading-relaxed text-[var(--text-primary)]">
            {generatedMarkdown}
          </pre>
        </section>
      </div>

      <div className="mt-stack-md flex flex-col gap-stack-sm sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={`inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
        >
          閉じる
        </button>
        <button
          type="submit"
          disabled={!canSave}
          className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
        >
          PR下書きを保存
        </button>
      </div>
    </form>
  );
}
