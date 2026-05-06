import { useMemo, useState } from 'react';
import type { ColumnKey, PracticeIssueDraft, PracticePullRequestDraft, Repo } from '../../types';
import { DEFAULT_CLASSIFY_CONFIG, classifyRepo, configToOptions } from '../../lib/classifyRepo';
import { focusRing } from '../../lib/focusRing';
import { usePracticeIssues } from '../../hooks/usePracticeIssues';
import { usePracticePullRequests } from '../../hooks/usePracticePullRequests';
import { useRepositoryMeta } from '../../hooks/useRepositoryMeta';
import { RepositoryDetailPanel } from '../repositories/RepositoryDetailPanel';
import { GithubTermHint } from './GithubTermHint';

interface PracticeHomeProps {
  accountId: string;
  repos: Repo[];
}

interface DraftWithRepo {
  draft: PracticeIssueDraft;
  repo: Repo | null;
}

interface PullRequestDraftWithRepo {
  draft: PracticePullRequestDraft;
  repo: Repo | null;
  relatedIssue: PracticeIssueDraft | null;
}

function formatPracticeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '保存日不明';
  }

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getDraftRepoLabel(repo: Repo | null, draft: PracticeIssueDraft): string {
  return repo?.nameWithOwner ?? `未取得のリポジトリ (${draft.repoId})`;
}

function getPullRequestDraftRepoLabel(repo: Repo | null, draft: PracticePullRequestDraft): string {
  return repo?.nameWithOwner ?? `未取得のリポジトリ (${draft.repoId})`;
}

function PracticeEmptyState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-surface-primary p-inset-xl">
      <div className="max-w-md text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-surface-secondary text-[var(--text-muted)]"
          aria-hidden
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6M8 4h8l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2z"
            />
          </svg>
        </div>
        <h2 className="mt-stack-md text-title-3 font-semibold text-[var(--text-primary)]">
          まだ練習下書きがありません
        </h2>
        <p className="mt-stack-sm text-body-sm leading-relaxed text-[var(--text-secondary)]">
          リポジトリ詳細で「下書きを作る」を押すと、ここに保存済みのやることカードが並びます。
        </p>
      </div>
    </div>
  );
}

export function PracticeHome({ accountId, repos }: PracticeHomeProps) {
  const {
    createIssueDraft,
    drafts,
    getDraftsForRepo,
    saveError: practiceIssueSaveError,
  } = usePracticeIssues(accountId);
  const {
    createPullRequestDraft,
    drafts: pullRequestDrafts,
    getDraftsForRepo: getPullRequestDraftsForRepo,
    saveError: practicePullRequestSaveError,
  } = usePracticePullRequests(accountId);
  const { getMeta, saveError: repositoryMetaSaveError, updateMeta } = useRepositoryMeta(accountId);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const classifyOptions = useMemo(() => configToOptions(DEFAULT_CLASSIFY_CONFIG), []);

  const repoById = useMemo(() => {
    const map = new Map<string, Repo>();
    repos.forEach((repo) => map.set(repo.id, repo));
    return map;
  }, [repos]);

  const draftItems = useMemo<DraftWithRepo[]>(
    () =>
      [...drafts]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((draft) => ({
          draft,
          repo: repoById.get(draft.repoId) ?? null,
        })),
    [drafts, repoById]
  );

  const issueById = useMemo(() => {
    const map = new Map<string, PracticeIssueDraft>();
    drafts.forEach((draft) => map.set(draft.id, draft));
    return map;
  }, [drafts]);

  const pullRequestDraftItems = useMemo<PullRequestDraftWithRepo[]>(
    () =>
      [...pullRequestDrafts]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map((draft) => ({
          draft,
          repo: repoById.get(draft.repoId) ?? null,
          relatedIssue: draft.relatedIssueDraftId ? issueById.get(draft.relatedIssueDraftId) ?? null : null,
        })),
    [issueById, pullRequestDrafts, repoById]
  );

  const totalDraftCount = drafts.length + pullRequestDrafts.length;

  const getAutoHealth = (repo: Repo): ColumnKey => classifyRepo(repo, classifyOptions);

  return (
    <div className="h-full overflow-auto bg-surface-app">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-stack-lg px-inset-lg py-inset-lg">
        <header className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm">
          <div className="flex flex-col gap-stack-md lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-[var(--text-muted)]">練習</p>
              <h1 className="mt-stack-xs text-title-1 font-bold text-[var(--text-primary)]">保存した練習下書き</h1>
              <p className="mt-stack-sm max-w-2xl text-body-sm leading-relaxed text-[var(--text-secondary)]">
                DevBoard内だけに保存したIssue練習とPull Request練習の下書きを、リポジトリごとに見返せます。
              </p>
            </div>

            <div className="rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-md py-inset-sm">
              <p className="text-caption font-semibold text-[var(--accent-blue-emphasis)]">保存済み下書き</p>
              <p className="mt-stack-xs text-title-3 font-bold text-[var(--accent-blue-emphasis)]">{totalDraftCount}件</p>
            </div>
          </div>
        </header>

        <GithubTermHint />

        {totalDraftCount === 0 ? (
          <PracticeEmptyState />
        ) : (
          <div className="grid gap-stack-lg">
            {draftItems.length > 0 && (
              <section aria-label="保存済みIssue練習ドラフト一覧" className="grid gap-stack-sm">
                <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">Issue / やることカード</h2>
                {draftItems.map(({ draft, repo }) => (
                  <article
                    key={draft.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm"
                  >
                    <div className="flex flex-col gap-stack-md lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-inline-sm">
                          <span className="rounded-lg border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--accent-green-emphasis)]">
                            Issue / やることカード
                          </span>
                          <span className="rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--accent-blue-emphasis)]">
                            DevBoard内だけ
                          </span>
                        </div>

                        <h3 className="mt-stack-sm break-words text-title-3 font-semibold text-[var(--text-primary)]">
                          {draft.title || '無題の下書き'}
                        </h3>
                        <p className="mt-stack-xs break-words text-body-sm font-medium text-[var(--text-secondary)]">
                          {getDraftRepoLabel(repo, draft)}
                        </p>
                        <p className="mt-stack-xs text-caption text-[var(--text-muted)]">
                          更新: {formatPracticeDate(draft.updatedAt)}
                        </p>
                      </div>

                      {repo && (
                        <button
                          type="button"
                          onClick={() => setSelectedRepo(repo)}
                          className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
                        >
                          リポジトリ詳細へ戻る
                        </button>
                      )}
                    </div>

                    <div className="mt-stack-md grid gap-stack-sm lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
                        <h4 className="text-caption font-semibold text-[var(--text-muted)]">なぜやる？</h4>
                        <p className="mt-stack-xs whitespace-pre-wrap text-body-sm leading-relaxed text-[var(--text-primary)]">
                          {draft.reason || '理由はまだ書かれていません。'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
                        <h4 className="text-caption font-semibold text-[var(--text-muted)]">終わりの条件</h4>
                        {draft.doneCriteria.length > 0 ? (
                          <ul className="mt-stack-xs list-disc space-y-1 pl-inset-md text-body-sm leading-relaxed text-[var(--text-primary)]">
                            {draft.doneCriteria.map((criterion, index) => (
                              <li key={`${criterion}-${index}`}>{criterion}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-stack-xs text-body-sm text-[var(--text-secondary)]">まだ条件がありません。</p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {pullRequestDraftItems.length > 0 && (
              <section aria-label="保存済みPull Request練習ドラフト一覧" className="grid gap-stack-sm">
                <h2 className="text-title-3 font-semibold text-[var(--text-primary)]">
                  Pull Request / 変更の確認リクエスト
                </h2>
                {pullRequestDraftItems.map(({ draft, repo, relatedIssue }) => (
                  <article
                    key={draft.id}
                    className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-lg shadow-sm"
                  >
                    <div className="flex flex-col gap-stack-md lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-inline-sm">
                          <span className="rounded-lg border border-[var(--accent-purple-border)] bg-[var(--accent-purple-muted)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--accent-purple-emphasis)]">
                            Pull Request / 変更の確認リクエスト
                          </span>
                          <span className="rounded-lg border border-[var(--accent-blue-border)] bg-[var(--accent-blue-muted)] px-inset-sm py-inset-xs text-caption font-semibold text-[var(--accent-blue-emphasis)]">
                            DevBoard内だけ
                          </span>
                        </div>

                        <h3 className="mt-stack-sm break-words text-title-3 font-semibold text-[var(--text-primary)]">
                          {draft.title || '無題のPR下書き'}
                        </h3>
                        <p className="mt-stack-xs break-words text-body-sm font-medium text-[var(--text-secondary)]">
                          {getPullRequestDraftRepoLabel(repo, draft)}
                        </p>
                        <p className="mt-stack-xs text-caption text-[var(--text-muted)]">
                          更新: {formatPracticeDate(draft.updatedAt)}
                        </p>
                      </div>

                      {repo && (
                        <button
                          type="button"
                          onClick={() => setSelectedRepo(repo)}
                          className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent-green)] px-inset-md py-inset-sm text-body-sm font-semibold text-text-inverse shadow-sm transition-colors motion-reduce:transition-none hover:bg-[var(--accent-green-strong)] ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
                        >
                          リポジトリ詳細へ戻る
                        </button>
                      )}
                    </div>

                    <div className="mt-stack-md grid gap-stack-sm lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
                        <h4 className="text-caption font-semibold text-[var(--text-muted)]">関連するやることカード</h4>
                        <p className="mt-stack-xs whitespace-pre-wrap text-body-sm leading-relaxed text-[var(--text-primary)]">
                          {relatedIssue?.title || '選択なし'}
                        </p>
                      </div>

                      <div className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md">
                        <h4 className="text-caption font-semibold text-[var(--text-muted)]">見てほしいこと</h4>
                        {draft.reviewPoints.length > 0 ? (
                          <ul className="mt-stack-xs list-disc space-y-1 pl-inset-md text-body-sm leading-relaxed text-[var(--text-primary)]">
                            {draft.reviewPoints.map((point, index) => (
                              <li key={`${point}-${index}`}>{point}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-stack-xs text-body-sm text-[var(--text-secondary)]">まだ項目がありません。</p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}
          </div>
        )}
      </div>

      {selectedRepo && (
        <RepositoryDetailPanel
          repo={selectedRepo}
          autoHealth={getAutoHealth(selectedRepo)}
          userMeta={getMeta(selectedRepo.id)}
          saveError={repositoryMetaSaveError}
          practiceIssueDrafts={getDraftsForRepo(selectedRepo.id)}
          practicePullRequestDrafts={getPullRequestDraftsForRepo(selectedRepo.id)}
          practiceIssueSaveError={practiceIssueSaveError}
          practicePullRequestSaveError={practicePullRequestSaveError}
          onCreatePracticeIssueDraft={(input) => createIssueDraft(selectedRepo.id, input)}
          onCreatePracticePullRequestDraft={(input) =>
            createPullRequestDraft(selectedRepo.id, input, getDraftsForRepo(selectedRepo.id))
          }
          onUserMetaChange={updateMeta}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </div>
  );
}
