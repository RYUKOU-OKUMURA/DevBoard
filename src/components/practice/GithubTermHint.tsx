import type { GitHubTermKey } from '../../lib/githubTerms';
import { getGitHubTerms } from '../../lib/githubTerms';

interface GithubTermHintProps {
  terms?: readonly GitHubTermKey[];
}

export function GithubTermHint({ terms }: GithubTermHintProps) {
  const visibleTerms = getGitHubTerms(terms);

  return (
    <section
      aria-label="GitHub用語の短い説明"
      className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm"
    >
      <div className="flex flex-col gap-stack-xs sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-semibold text-[var(--text-muted)]">GitHub用語メモ</p>
          <h2 className="mt-stack-xs text-title-3 font-semibold text-[var(--text-primary)]">
            英語名と意味をセットで見る
          </h2>
        </div>
        <span className="text-caption text-[var(--text-muted)]">必要なときだけ読める短い説明</span>
      </div>

      <div className="mt-stack-md grid gap-stack-sm sm:grid-cols-2 xl:grid-cols-4">
        {visibleTerms.map((term) => (
          <article
            key={term.key}
            className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md"
          >
            <div className="flex flex-wrap items-baseline gap-inline-sm">
              <h3 className="text-body-sm font-semibold text-[var(--text-primary)]">{term.label}</h3>
              <span className="text-caption font-semibold text-[var(--accent-blue-emphasis)]">
                {term.beginnerLabel}
              </span>
            </div>
            <p className="mt-stack-xs text-body-sm leading-relaxed text-[var(--text-secondary)]">
              {term.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
