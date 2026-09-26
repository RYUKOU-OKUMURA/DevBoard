import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createIssue, type GitHubIssue } from '../api/issues';
import {
  getLegacyTodoConversionMap,
  recordLegacyTodoConversion,
} from '../storage/legacyTodoConvertedStorage';
import { readLegacyDueDate, updateIssueLocalMeta } from '../storage/issueLocalMetaStorage';
import type { IssueLocalMetaPatch } from '../types';
import type { Repo } from '../types';
import type { Todo, TodoPriority } from '../types/todo';
import { getTodoById, getTodos, updateTodo } from '../utils/todoStorage';
import { toJapaneseIssueActionError } from './useIssueActions';

const activeConversions = new Set<string>();
const convertedIssueByTodoKey = new Map<string, number>();

function conversionKey(accountId: string, todoId: string): string {
  return `${accountId}:${todoId}`;
}

function rememberConvertedIssue(accountId: string, todoId: string, issueNumber: number): void {
  convertedIssueByTodoKey.set(conversionKey(accountId, todoId), issueNumber);
  recordLegacyTodoConversion(accountId, todoId, issueNumber);
}

function getRememberedConversion(accountId: string, todoId: string): number | undefined {
  const memory = convertedIssueByTodoKey.get(conversionKey(accountId, todoId));
  if (memory !== undefined) return memory;
  return getLegacyTodoConversionMap(accountId)[todoId];
}

function mergeConvertedMap(accountId: string): Record<string, number> {
  const fromStorage = getLegacyTodoConversionMap(accountId);
  const merged = { ...fromStorage };
  convertedIssueByTodoKey.forEach((issueNumber, key) => {
    const separator = key.indexOf(':');
    if (separator < 0) return;
    const keyAccountId = key.slice(0, separator);
    const todoId = key.slice(separator + 1);
    if (keyAccountId === accountId && todoId) merged[todoId] = issueNumber;
  });
  return merged;
}

function parseRepoNameWithOwner(nameWithOwner: string): { owner: string; repo: string } {
  const [owner, ...repoParts] = nameWithOwner.split('/');
  const repo = repoParts.join('/');
  if (!owner || !repo) throw new Error('Invalid repository nameWithOwner.');
  return { owner, repo };
}

function isTodoPriority(value: Todo['priority']): value is TodoPriority {
  return value === 'high' || value === 'medium' || value === 'low';
}

function buildConfirmMessage(repoName: string, todo: Todo): string {
  const lines = [
    'GitHub Issue（やること）を新規作成します。',
    '',
    `リポジトリ名: ${repoName}`,
    `タイトル: ${todo.title}`,
  ];
  if (todo.status === 'done') {
    lines.push('', '旧TODOでは完了済みですが、未完了（Open）のIssueとして作成されます。');
  }
  lines.push('', 'GitHub上に新しいIssueが作成されます。続けますか？');
  return lines.join('\n');
}

function metaPatchFromTodo(todo: Todo): IssueLocalMetaPatch {
  const patch: IssueLocalMetaPatch = {};
  if (isTodoPriority(todo.priority)) patch.priority = todo.priority;
  const dueDate = readLegacyDueDate(todo.dueDate);
  if (dueDate) patch.dueDate = dueDate;
  if (todo.description) patch.note = todo.description;
  return patch;
}

function loadFreshTodo(accountId: string, todoId: string): Todo | null {
  const fresh = getTodoById(accountId, todoId);
  if (!fresh || typeof fresh.issueNumber === 'number') return null;
  return fresh;
}

export type LegacyTodoSuccessNotice = {
  issueNumber: number;
  issueUrl: string;
  repoName: string;
  tracked: boolean;
  metaWarning?: string;
};

interface LegacyTodoConversionState {
  accountId: string;
  todos: Todo[];
  isConverting: boolean;
  errorsByTodoId: Record<string, string>;
  convertedByTodoId: Record<string, number>;
  successNotice: LegacyTodoSuccessNotice | null;
}

function loadAccount(accountId: string): LegacyTodoConversionState {
  return {
    accountId,
    todos: getTodos(accountId),
    isConverting: false,
    errorsByTodoId: {},
    convertedByTodoId: mergeConvertedMap(accountId),
    successNotice: null,
  };
}

export interface LegacyTodoConversionOptions {
  isRepoTracked: (repoId: string) => boolean;
  onIssueUpsert: (repoId: string, issue: GitHubIssue) => void;
}

export function useLegacyTodoConversion(
  accountId: string,
  repos: Repo[],
  { isRepoTracked, onIssueUpsert }: LegacyTodoConversionOptions
) {
  const [state, setState] = useState<LegacyTodoConversionState>(() => loadAccount(accountId));
  const accountIdRef = useRef(accountId);
  accountIdRef.current = accountId;

  useEffect(() => {
    if (state.accountId !== accountId) setState(loadAccount(accountId));
  }, [accountId, state.accountId]);

  const repoById = useMemo(() => new Map(repos.map((repo) => [repo.id, repo])), [repos]);

  const unlinkedTodos = useMemo(() => {
    if (state.accountId !== accountId) return [];
    return state.todos.filter((todo) => typeof todo.issueNumber !== 'number');
  }, [accountId, state.accountId, state.todos]);

  const reloadTodos = useCallback((forAccountId: string) => {
    if (accountIdRef.current !== forAccountId) return;
    setState((current) => {
      if (current.accountId !== forAccountId) return current;
      return {
        ...current,
        todos: getTodos(forAccountId),
        convertedByTodoId: mergeConvertedMap(forAccountId),
      };
    });
  }, []);

  const convertTodo = useCallback(async (todo: Todo) => {
    const startedAccountId = accountId;

    const remembered = getRememberedConversion(startedAccountId, todo.id);
    if (remembered !== undefined) return;

    const lockKey = conversionKey(startedAccountId, todo.id);
    if (activeConversions.has(lockKey)) return;

    const repo = repoById.get(todo.repoId);
    if (!repo) return;

    activeConversions.add(lockKey);

    setState((current) => {
      if (current.accountId !== startedAccountId) return current;
      const nextErrors = { ...current.errorsByTodoId };
      delete nextErrors[todo.id];
      return { ...current, errorsByTodoId: nextErrors, successNotice: null };
    });

    try {
      let freshTodo = loadFreshTodo(startedAccountId, todo.id);
      if (!freshTodo) {
        reloadTodos(startedAccountId);
        return;
      }

      const confirmed = window.confirm(buildConfirmMessage(repo.nameWithOwner, freshTodo));
      if (!confirmed) return;

      freshTodo = loadFreshTodo(startedAccountId, todo.id);
      if (!freshTodo) {
        reloadTodos(startedAccountId);
        return;
      }

      if (accountIdRef.current !== startedAccountId) return;

      setState((current) => (
        current.accountId === startedAccountId ? { ...current, isConverting: true } : current
      ));

      const { owner, repo: repoName } = parseRepoNameWithOwner(repo.nameWithOwner);
      const body = freshTodo.description?.trim() ? freshTodo.description : undefined;
      const issue = await createIssue(owner, repoName, { title: freshTodo.title, body });

      rememberConvertedIssue(startedAccountId, freshTodo.id, issue.number);

      updateTodo(startedAccountId, freshTodo.id, { issueNumber: issue.number, issueUrl: issue.html_url });
      const persisted = getTodoById(startedAccountId, freshTodo.id)?.issueNumber === issue.number;

      const metaPatch = metaPatchFromTodo(freshTodo);
      let metaWarning: string | undefined;
      if (Object.keys(metaPatch).length > 0 && !updateIssueLocalMeta(startedAccountId, repo.id, issue.number, metaPatch)) {
        metaWarning = 'Issueは作成しましたが、優先度・期限・メモを引き継げませんでした。';
      }

      if (accountIdRef.current !== startedAccountId) return;

      const tracked = isRepoTracked(repo.id);
      if (tracked) onIssueUpsert(repo.id, issue);

      const successNotice: LegacyTodoSuccessNotice = {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        repoName: repo.nameWithOwner,
        tracked,
        metaWarning,
      };

      setState((current) => {
        if (current.accountId !== startedAccountId) return current;
        const convertedByTodoId = mergeConvertedMap(startedAccountId);
        const errorsByTodoId = { ...current.errorsByTodoId };
        if (!persisted) {
          errorsByTodoId[freshTodo.id] =
            `Issue #${issue.number} はGitHub上に作成済みです。TODOへの記録に失敗したため、再度変換しないでください。`;
        } else {
          delete errorsByTodoId[freshTodo.id];
        }
        return {
          ...current,
          isConverting: false,
          convertedByTodoId,
          errorsByTodoId,
          successNotice,
          todos: persisted ? getTodos(startedAccountId) : current.todos,
        };
      });
    } catch (error) {
      if (accountIdRef.current !== startedAccountId) return;
      setState((current) => {
        if (current.accountId !== startedAccountId) return current;
        return {
          ...current,
          isConverting: false,
          errorsByTodoId: {
            ...current.errorsByTodoId,
            [todo.id]: toJapaneseIssueActionError('GitHub Issueを作成する', error),
          },
        };
      });
    } finally {
      activeConversions.delete(lockKey);
      if (accountIdRef.current === startedAccountId) {
        setState((current) => (
          current.accountId === startedAccountId && current.isConverting
            ? { ...current, isConverting: false }
            : current
        ));
      }
    }
  }, [accountId, isRepoTracked, onIssueUpsert, reloadTodos, repoById]);

  return {
    unlinkedTodos,
    isConverting: state.accountId === accountId ? state.isConverting : false,
    errorsByTodoId: state.accountId === accountId ? state.errorsByTodoId : {},
    convertedByTodoId: state.accountId === accountId ? state.convertedByTodoId : {},
    successNotice: state.accountId === accountId ? state.successNotice : null,
    convertTodo,
    getRepo: (repoId: string) => repoById.get(repoId),
  };
}
