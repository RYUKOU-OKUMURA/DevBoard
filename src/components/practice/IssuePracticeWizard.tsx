import { type FormEvent, useMemo, useState } from 'react';
import { focusRing } from '../../lib/focusRing';
import { generatePracticeIssueMarkdown, parseDoneCriteria } from '../../lib/practiceTemplates';

interface IssuePracticeWizardInput {
  title: string;
  reason: string;
  doneCriteria: string[];
}

interface IssuePracticeWizardProps {
  repoNameWithOwner: string;
  saveError?: string | null;
  onCancel: () => void;
  onSave: (input: IssuePracticeWizardInput) => boolean;
}

export function IssuePracticeWizard({
  repoNameWithOwner,
  saveError,
  onCancel,
  onSave,
}: IssuePracticeWizardProps) {
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [doneCriteriaText, setDoneCriteriaText] = useState('');

  const doneCriteria = useMemo(() => parseDoneCriteria(doneCriteriaText), [doneCriteriaText]);
  const generatedMarkdown = useMemo(
    () => generatePracticeIssueMarkdown({ title, reason, doneCriteria }),
    [doneCriteria, reason, title]
  );
  const canSave = title.trim().length > 0 && reason.trim().length > 0 && doneCriteria.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) {
      return;
    }

    const saved = onSave({ title, reason, doneCriteria });
    if (saved) {
      setTitle('');
      setReason('');
      setDoneCriteriaText('');
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
          <p className="text-caption font-semibold text-[var(--text-muted)]">GitHub Issue / やることカード練習</p>
          <h4 className="mt-stack-xs text-title-3 font-semibold text-[var(--text-primary)]">
            {repoNameWithOwner} の下書き
          </h4>
        </div>
        <span className="rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--accent-blue-emphasis)]">
          DevBoard内だけに保存
        </span>
      </div>

      <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
        GitHubには作成しません。あとで見返せるように、やることをIssue風のMarkdownへ整えます。
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
          <span className="text-caption font-semibold text-[var(--text-muted)]">やりたいこと</span>
          <input
            type="text"
            name="practice-issue-title"
            autoComplete="off"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例: トップページのボタンを見やすくする"
            className={`w-full rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          />
        </label>

        <label className="grid gap-stack-xs">
          <span className="text-caption font-semibold text-[var(--text-muted)]">なぜやる？</span>
          <textarea
            name="practice-issue-reason"
            autoComplete="off"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="例: 初めて見る人に分かりやすくしたいから"
            className={`min-h-24 w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          />
        </label>

        <label className="grid gap-stack-xs">
          <span className="text-caption font-semibold text-[var(--text-muted)]">終わりの条件</span>
          <textarea
            name="practice-issue-done-criteria"
            autoComplete="off"
            value={doneCriteriaText}
            onChange={(event) => setDoneCriteriaText(event.target.value)}
            rows={4}
            placeholder={`例:\nボタンの色が目立つ\n説明文が短く分かりやすい\nスマホ幅でも横スクロールしない`}
            className={`min-h-28 w-full resize-y rounded-lg border border-[var(--border-subtle)] bg-surface-secondary px-inset-md py-inset-sm text-body-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors motion-reduce:transition-none ${focusRing.default} focus-visible:border-[var(--accent-green)] focus-visible:ring-[var(--accent-green)]`}
          />
        </label>

        <section aria-label="生成Markdownプレビュー" className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
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
          下書きを保存
        </button>
      </div>
    </form>
  );
}
