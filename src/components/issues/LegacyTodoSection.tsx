import { focusRing } from '../../lib/focusRing';
import type { LegacyTodoSuccessNotice } from '../../hooks/useLegacyTodoConversion';
import type { Todo } from '../../types/todo';
import { readLegacyDueDate } from '../../storage/issueLocalMetaStorage';

const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' } as const;

interface LegacyTodoSectionProps {
  todos: Todo[];
  isConverting: boolean;
  errorsByTodoId: Record<string, string>;
  convertedByTodoId: Record<string, number>;
  successNotice: LegacyTodoSuccessNotice | null;
  getRepoName: (repoId: string) => string | undefined;
  onConvert: (todo: Todo) => void;
}

export function LegacyTodoSection({
  todos,
  isConverting,
  errorsByTodoId,
  convertedByTodoId,
  successNotice,
  getRepoName,
  onConvert,
}: LegacyTodoSectionProps) {
  if (todos.length === 0 && !successNotice) return null;

  return (
    <section
      aria-label="Issueになっていない旧TODO"
      className="rounded-lg border border-[var(--border-subtle)] bg-surface-secondary p-inset-md"
    >
      {successNotice && (
        <div
          role="status"
          className="mb-stack-sm rounded-lg border border-[var(--accent-green-border)] bg-[var(--accent-green-muted)] p-inset-sm text-body-sm text-[var(--accent-green-emphasis)]"
        >
          <p>
            Issue #{successNotice.issueNumber} を作成しました（{successNotice.repoName}）。
          </p>
          <p className="mt-stack-xs">
            <a
              href={successNotice.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-semibold underline ${focusRing.default} focus-visible:ring-[var(--accent-green)]`}
            >
              GitHubで開く
            </a>
          </p>
          {!successNotice.tracked && (
            <p className="mt-stack-xs text-caption text-[var(--text-secondary)]">
              リポジトリを進捗管理に追加すると一覧に出ます。
            </p>
          )}
          {successNotice.metaWarning && (
            <p className="mt-stack-xs text-caption text-[var(--accent-yellow-emphasis)]">
              {successNotice.metaWarning}
            </p>
          )}
        </div>
      )}
      {todos.length > 0 && (
        <>
          <h2 className="text-body font-semibold text-[var(--text-primary)]">Issueになっていない旧TODO</h2>
          <p className="mt-stack-xs text-body-sm text-[var(--text-secondary)]">
            DevBoard内だけに残っているTODOを、確認のうえ GitHub Issue（やること）に変換できます。
          </p>
          <ul className="mt-stack-sm grid list-none gap-stack-sm p-0">
            {todos.map((todo) => {
              const repoName = getRepoName(todo.repoId);
              const missingRepo = !repoName;
              const createdNumber = convertedByTodoId[todo.id];
              const alreadyCreated = typeof createdNumber === 'number';
              const disabled = missingRepo || isConverting || alreadyCreated;
              const dueDate = readLegacyDueDate(todo.dueDate);
              const priorityLabel =
                todo.priority === 'high' || todo.priority === 'medium' || todo.priority === 'low'
                  ? PRIORITY_LABEL[todo.priority]
                  : null;

              return (
                <li
                  key={todo.id}
                  className="rounded-lg border border-[var(--border-subtle)] bg-surface-primary p-inset-sm"
                >
                  <div className="flex flex-col gap-stack-sm sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-inline-sm">
                        <p className="break-words text-body-sm font-semibold text-[var(--text-primary)]">{todo.title}</p>
                        {todo.status === 'done' && (
                          <span className="rounded-full border border-[var(--border-subtle)] bg-surface-secondary px-inline-sm py-inline-xs text-caption font-semibold text-[var(--text-secondary)]">
                            旧TODOでは完了
                          </span>
                        )}
                      </div>
                      <p className="mt-stack-xs text-caption text-[var(--text-muted)]">
                        リポジトリ: {repoName ?? '（一覧にないリポジトリ）'}
                      </p>
                      {(priorityLabel || dueDate) && (
                        <p className="mt-stack-xs text-caption text-[var(--text-secondary)]">
                          {priorityLabel && `優先度: ${priorityLabel}`}
                          {priorityLabel && dueDate && ' · '}
                          {dueDate && `期限: ${dueDate}`}
                        </p>
                      )}
                      {alreadyCreated && (
                        <p className="mt-stack-xs text-caption font-semibold text-[var(--text-secondary)]">
                          Issue #{createdNumber} は作成済み
                        </p>
                      )}
                      {missingRepo && (
                        <p className="mt-stack-xs text-caption text-[var(--text-muted)]">
                          リポジトリ画面でこのリポジトリを表示できる状態にしてから変換してください。
                        </p>
                      )}
                      {errorsByTodoId[todo.id] && (
                        <p role="alert" className="mt-stack-xs text-caption text-[var(--accent-red-emphasis)]">
                          {errorsByTodoId[todo.id]}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onConvert(todo)}
                      className={`shrink-0 inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-surface-secondary px-inset-md py-inset-xs text-body-sm font-semibold text-[var(--text-primary)] transition-colors motion-reduce:transition-none hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-70 ${focusRing.default} focus-visible:ring-[var(--accent-blue)]`}
                    >
                      {isConverting ? '作成中…' : 'GitHub Issueにする'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
