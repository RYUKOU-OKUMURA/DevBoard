import React, { useMemo, useState } from 'react';
import type { Todo, TodoPriority } from '../types';
import { useTodos } from '../hooks/useTodos';
import { useToast } from '../hooks/useToast';
import { focusRing } from '../lib/focusRing';
import { timeAgo } from '../lib/timeAgo';

type LabelLike = string | { name: string; color?: string };
type AssigneeLike = string | { login: string };

export type ActivityIssueState = 'OPEN' | 'CLOSED' | 'open' | 'closed';

export interface ActivityIssue {
  id: string;
  title: string;
  number: number;
  url: string;
  repoId?: string;
  repoNameWithOwner: string;
  repoUrl?: string;
  state?: ActivityIssueState;
  labels?: LabelLike[];
  assignees?: AssigneeLike[];
  description?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface ActivityIssueToTodoInput {
  title: string;
  repoId: string;
  issueNumber: number;
  issueUrl: string;
  status: 'todo';
  priority: TodoPriority;
  syncEnabled: boolean;
  labels: string[];
  assignee?: string;
  description?: string;
}

interface ActivityIssueCardProps {
  issue: ActivityIssue;
  className?: string;
  defaultPriority?: TodoPriority;
  inheritLabels?: boolean;
  inheritAssignees?: boolean;
  existingTodos?: Todo[];
  onConvert?: (payload: ActivityIssueToTodoInput) => Promise<Todo>;
  /**
   * Allow parent to add optimistic item. Return rollback to undo on failure.
   */
  onOptimisticCreate?: (payload: ActivityIssueToTodoInput) => (() => void) | void;
  onConverted?: (todo: Todo) => void;
}

export const ActivityIssueCard: React.FC<ActivityIssueCardProps> = ({
  issue,
  className = '',
  defaultPriority = 'medium',
  inheritLabels = false,
  inheritAssignees = false,
  existingTodos,
  onConvert,
  onOptimisticCreate,
  onConverted,
}) => {
  const { todos, createTodo } = useTodos({ autoLoad: true });
  const { showToast } = useToast();
  const [isConverting, setIsConverting] = useState(false);

  const normalizedLabels = useMemo(
    () =>
      (issue.labels ?? []).map((label) =>
        typeof label === 'string' ? { name: label } : { name: label.name, color: label.color }
      ),
    [issue.labels]
  );

  const normalizedAssignees = useMemo(
    () =>
      (issue.assignees ?? []).map((assignee) =>
        typeof assignee === 'string' ? assignee : assignee.login
      ),
    [issue.assignees]
  );

  const mergedTodos = useMemo(() => {
    if (!existingTodos || existingTodos.length === 0) {
      return todos;
    }
    const map = new Map<string, Todo>();
    [...todos, ...existingTodos].forEach((todo) => {
      map.set(todo.id, todo);
    });
    return Array.from(map.values());
  }, [existingTodos, todos]);

  const hasDuplicate = useMemo(() => {
    if (!issue.repoId) return false;
    return mergedTodos.some(
      (todo) => todo.repoId === issue.repoId && todo.issueNumber === issue.number
    );
  }, [issue.number, issue.repoId, mergedTodos]);

  const state = (issue.state ?? 'OPEN').toUpperCase() as 'OPEN' | 'CLOSED';
  const isClosed = state === 'CLOSED';
  const statusStyles = isClosed
    ? 'bg-[var(--accent-purple-muted)] text-[var(--accent-purple-emphasis)] border-[var(--accent-purple-border)]'
    : 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border-[var(--accent-green-border)]';

  const updatedLabel = useMemo(() => {
    const date = issue.updatedAt ?? issue.createdAt;
    if (!date) return '更新日時不明';
    return timeAgo(date, { locale: 'ja' });
  }, [issue.createdAt, issue.updatedAt]);

  const disableReason = useMemo(() => {
    if (!issue.repoId) return 'リポジトリIDが不明のため変換できません';
    if (hasDuplicate) return 'このIssueは既にTODO化されています';
    return null;
  }, [hasDuplicate, issue.repoId]);

  const handleConvert = async () => {
    if (isConverting || disableReason) return;
    if (!issue.repoId) return;

    const payload: ActivityIssueToTodoInput = {
      title: issue.title,
      description: issue.description,
      repoId: issue.repoId,
      issueNumber: issue.number,
      issueUrl: issue.url,
      status: 'todo',
      priority: defaultPriority,
      syncEnabled: true,
      labels: inheritLabels ? normalizedLabels.map((label) => label.name) : [],
      assignee: inheritAssignees ? normalizedAssignees[0] : undefined,
    };

    const rollback = onOptimisticCreate?.(payload);
    setIsConverting(true);

    try {
      const created = onConvert ? await onConvert(payload) : await createTodo(payload);
      if (created) {
        onConverted?.(created);
      }
      showToast({
        variant: 'success',
        title: 'TODOを作成しました',
        description: `#${issue.number} をTODOに追加しました`,
      });
    } catch (error) {
      rollback?.();
      const message = error instanceof Error ? error.message : '変換に失敗しました';
      showToast({
        variant: 'error',
        title: '変換に失敗しました',
        description: message,
      });
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <article
      className={`
        group
        bg-surface-primary
        border border-[var(--border-subtle)]
        rounded-xl
        p-inset-md
        shadow-sm
        hover:shadow-md
        hover:border-[var(--accent-green-border)]
        transition-all duration-200
        ${focusRing.default}
        ${className}
      `.trim()}
      role="article"
      aria-label={`Issue #${issue.number}: ${issue.title}`}
      tabIndex={0}
    >
      <div className="flex items-start gap-inline-md">
        <div className="flex-1 min-w-0 space-y-stack-xs">
          <div className="flex items-center gap-inline-xs">
            <span
              className={`
                inline-flex items-center gap-inline-2xs px-inline-sm py-stack-2xs
                text-caption font-semibold uppercase tracking-wide
                border rounded-lg
                ${statusStyles}
              `}
            >
              <span
                className="w-2 h-2 rounded-full"
                aria-hidden
                style={{
                  backgroundColor: isClosed
                    ? 'var(--accent-purple)'
                    : 'var(--accent-green)',
                }}
              />
              {isClosed ? 'Closed' : 'Open'}
            </span>
            <span className="text-caption text-[var(--text-tertiary)] truncate">
              {issue.repoNameWithOwner}
            </span>
          </div>

          <a
            href={issue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              block
              text-body-md
              font-semibold
              text-[var(--text-primary)]
              hover:text-[var(--accent-green)]
              transition-colors
              line-clamp-2
            "
          >
            {issue.title}
          </a>

          <div className="flex items-center gap-inline-sm text-caption text-[var(--text-muted)] flex-wrap">
            <span className="font-semibold text-[var(--text-secondary)]">#{issue.number}</span>
            <span aria-hidden>•</span>
            <span className="truncate">{updatedLabel}</span>
            {issue.repoUrl && (
              <>
                <span aria-hidden>•</span>
                <a
                  href={issue.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent-blue)] hover:underline"
                >
                  Repo
                </a>
              </>
            )}
          </div>

          {normalizedLabels.length > 0 && (
            <div className="flex items-center gap-inline-xs flex-wrap mt-stack-2xs">
              {normalizedLabels.slice(0, 4).map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium border border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
                  style={
                    label.color
                      ? {
                          borderColor: `#${label.color}33`,
                          backgroundColor: `#${label.color}15`,
                          color: `#${label.color}`,
                        }
                      : undefined
                  }
                >
                  {label.name}
                </span>
              ))}
              {normalizedLabels.length > 4 && (
                <span className="text-caption text-[var(--text-tertiary)]">
                  +{normalizedLabels.length - 4}
                </span>
              )}
            </div>
          )}

          {normalizedAssignees.length > 0 && (
            <div className="text-caption text-[var(--text-secondary)]">
              担当: {normalizedAssignees.slice(0, 3).join(', ')}
              {normalizedAssignees.length > 3 && ` 他${normalizedAssignees.length - 3}名`}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleConvert}
          disabled={Boolean(disableReason) || isConverting}
          aria-label={
            disableReason
              ? disableReason
              : `Issue #${issue.number} をTODOに変換`
          }
          title={disableReason ?? 'TODOに変換'}
          className={`
            inline-flex items-center justify-center
            w-10 h-10
            rounded-lg
            border border-[var(--border-subtle)]
            bg-[var(--bg-secondary)]
            text-[var(--text-primary)]
            hover:text-[var(--accent-green)]
            hover:border-[var(--accent-green-border)]
            transition-all duration-150
            ${focusRing.default}
            ${disableReason || isConverting ? 'opacity-70 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}
          `}
        >
          {isConverting ? (
            <svg
              className="w-4 h-4 animate-spin text-[var(--accent-green)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" className="opacity-20" />
              <path d="M12 2a10 10 0 0110 10" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" />
            </svg>
          )}
        </button>
      </div>
    </article>
  );
};
