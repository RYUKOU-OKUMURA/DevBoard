import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivitySummaryStats } from './ActivitySummaryStats';
import { ActivityPanel, type ActivityPanelFilters } from './ActivityPanel';
import { ActivityIssueCard, type ActivityIssue, type ActivityIssueToTodoInput } from './ActivityIssueCard';
import { TodoPanel } from './TodoPanel';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivities } from '../hooks/useRecentActivities';
import { useTodos } from '../hooks/useTodos';
import type { Repo, RecentItem, Todo, TodoFilter, TodoStatus } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';

interface ActivityTabProps {
  repos: Repo[];
}

type PersistedFilters = {
  activity: ActivityPanelFilters;
  todo: {
    repoId?: string;
    status?: TodoStatus[];
    assignee?: string;
    searchQuery?: string;
  };
};

const STORAGE_KEY_BASE = 'activityTab.filters.v1';

const getStorageKey = (username?: string) =>
  username ? `${STORAGE_KEY_BASE}:${username}` : STORAGE_KEY_BASE;

const defaultActivityFilters: ActivityPanelFilters = {
  repo: 'all',
  type: 'all',
  status: 'all',
};

const defaultTodoPersisted = {
  repoId: undefined,
  status: undefined,
  assignee: undefined,
  searchQuery: undefined,
} satisfies PersistedFilters['todo'];

function parseActivityFiltersFromQuery(params: URLSearchParams): Partial<ActivityPanelFilters> {
  const repo = params.get('activityRepo');
  const type = params.get('activityType');
  const status = params.get('activityStatus');
  return {
    repo: repo || undefined,
    type: type as ActivityPanelFilters['type'] | null || undefined,
    status: status as ActivityPanelFilters['status'] | null || undefined,
  };
}

function parseTodoFiltersFromQuery(params: URLSearchParams): {
  filter: Partial<TodoFilter>;
  searchQuery?: string;
} {
  const repoId = params.get('todoRepo');
  const statusRaw = params.get('todoStatus');
  const assignee = params.get('todoAssignee') || undefined;
  const searchQuery = params.get('todoSearch') || undefined;

  const status = statusRaw
    ? (statusRaw.split(',').filter(Boolean) as TodoStatus[])
    : undefined;

  const filter: Partial<TodoFilter> = {};
  if (repoId && repoId !== 'all') filter.repoIds = [repoId];
  if (status && status.length) filter.status = status;
  if (assignee) filter.assignee = assignee;
  if (searchQuery) filter.searchQuery = searchQuery;

  return { filter, searchQuery };
}

function readInitialFilters(username?: string): {
  activity: ActivityPanelFilters;
  todoFilter: TodoFilter;
  todoSearch?: string;
} {
  const storageKey = getStorageKey(username);
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const persisted = getStorageItem<PersistedFilters>(storageKey, {
    activity: defaultActivityFilters,
    todo: defaultTodoPersisted,
  });

  const activityFromQuery = params ? parseActivityFiltersFromQuery(params) : {};
  const activity: ActivityPanelFilters = {
    ...defaultActivityFilters,
    ...persisted.activity,
    ...activityFromQuery,
  };

  const todoFromQuery = params ? parseTodoFiltersFromQuery(params) : { filter: {}, searchQuery: undefined };
  const todoFilter: TodoFilter = {
    ...((persisted.todo.repoId && { repoIds: [persisted.todo.repoId] }) || {}),
    ...(persisted.todo.status ? { status: persisted.todo.status } : {}),
    ...(persisted.todo.assignee ? { assignee: persisted.todo.assignee } : {}),
    ...todoFromQuery.filter,
  };

  return {
    activity,
    todoFilter,
    todoSearch: todoFromQuery.searchQuery ?? persisted.todo.searchQuery,
  };
}

function mergeTodos(a: Todo[], b: Todo[]): Todo[] {
  if (!a.length) return b;
  if (!b.length) return a;
  const map = new Map<string, Todo>();
  [...a, ...b].forEach((todo) => map.set(todo.id, todo));
  return Array.from(map.values());
}

export const ActivityTab: React.FC<ActivityTabProps> = ({ repos }) => {
  const { user } = useAuth();
  const storageKey = useMemo(() => getStorageKey(user?.username), [user?.username]);

  const repoIdMap = useMemo(() => {
    const map = new Map<string, string>();
    repos.forEach((repo) => map.set(repo.nameWithOwner, repo.id));
    return map;
  }, [repos]);

  const initialFilters = useMemo(() => readInitialFilters(user?.username), [user?.username]);
  const [activityFilters, setActivityFilters] = useState<ActivityPanelFilters>(
    initialFilters.activity
  );
  const [todoFilter, setTodoFilter] = useState<TodoFilter>(initialFilters.todoFilter);
  const [todoSearch, setTodoSearch] = useState<string | undefined>(initialFilters.todoSearch);
  const [todoRefreshToken, setTodoRefreshToken] = useState(0);
  const [optimisticTodos, setOptimisticTodos] = useState<Todo[]>([]);

  const { recentItems, isLoading: isLoadingActivities } = useRecentActivities(user, {
    enabled: true,
  });

  const {
    todos,
    stats: todoStats,
    createTodo,
    refresh: refreshTodos,
  } = useTodos({ autoLoad: true });

  const mergedTodos = useMemo(
    () => mergeTodos(optimisticTodos, todos),
    [optimisticTodos, todos]
  );

  // Activity items split
  const issues = useMemo(
    () => recentItems.filter((item) => item.type === 'Issue'),
    [recentItems]
  );
  const pullRequests = useMemo(
    () => recentItems.filter((item) => item.type === 'PullRequest'),
    [recentItems]
  );

  // Filtered issues for conversion (ActivityPanelのフィルターに合わせる)
  const filteredIssuesForConvert = useMemo(() => {
    const matchesRepo = (item: RecentItem) =>
      activityFilters.repo === 'all' || item.repo.nameWithOwner === activityFilters.repo;
    const matchesStatus = (item: RecentItem) => {
      if (activityFilters.status === 'all') return true;
      const state = (item.state ?? 'OPEN').toUpperCase();
      if (activityFilters.status === 'merged') return item.type === 'PullRequest' && state === 'MERGED';
      if (activityFilters.status === 'open') return state === 'OPEN';
      return state === 'CLOSED';
    };

    return issues.filter((item) => matchesRepo(item) && matchesStatus(item));
  }, [activityFilters.repo, activityFilters.status, issues]);

  const convertibleIssues: ActivityIssue[] = useMemo(
    () =>
      filteredIssuesForConvert
        .map((issue) => {
          const repoId = repoIdMap.get(issue.repo.nameWithOwner);
          return {
            id: `${issue.repo.nameWithOwner}-${issue.number}`,
            title: issue.title,
            number: issue.number,
            url: issue.url,
            repoId,
            repoNameWithOwner: issue.repo.nameWithOwner,
            repoUrl: issue.repo.htmlUrl,
            state: issue.state,
            updatedAt: issue.occurredAt,
            createdAt: issue.occurredAt,
          } as ActivityIssue;
        })
        .filter((issue): issue is ActivityIssue & { repoId: string } => Boolean(issue.repoId)),
    [filteredIssuesForConvert, repoIdMap]
  );

  // Summary stats
  const issueCounts = useMemo(() => {
    const open = issues.filter((item) => (item.state ?? 'OPEN') === 'OPEN').length;
    const closed = issues.length - open;
    return { open, closed };
  }, [issues]);

  const prCounts = useMemo(() => {
    let open = 0;
    let merged = 0;
    let closed = 0;
    pullRequests.forEach((pr) => {
      const state = pr.state ?? 'OPEN';
      if (state === 'MERGED') merged += 1;
      else if (state === 'CLOSED') closed += 1;
      else open += 1;
    });
    return { open, merged, closed };
  }, [pullRequests]);

  const summaryStats = useMemo(
    () => ({
      issues: {
        open: issueCounts.open,
        closed: issueCounts.closed,
      },
      pullRequests: {
        open: prCounts.open,
        merged: prCounts.merged,
        closed: prCounts.closed,
      },
      todos: {
        todo: todoStats?.todo ?? 0,
        inProgress: todoStats?.inProgress ?? 0,
        done: todoStats?.done ?? 0,
        total: todoStats?.total ?? (todoStats
          ? todoStats.todo + todoStats.inProgress + todoStats.done
          : undefined),
      },
    }),
    [issueCounts.closed, issueCounts.open, prCounts.closed, prCounts.merged, prCounts.open, todoStats]
  );

  // アカウント切替時にフィルタをリセット（アカウント別永続化）
  useEffect(() => {
    const next = readInitialFilters(user?.username);
    setActivityFilters(next.activity);
    setTodoFilter(next.todoFilter);
    setTodoSearch(next.todoSearch);
  }, [user?.username]);

  // Persist filters to URL & localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    const setOrDelete = (key: string, value: string | undefined, defaultValue?: string) => {
      if (!value || (defaultValue !== undefined && value === defaultValue)) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    };

    setOrDelete('activityRepo', activityFilters.repo, 'all');
    setOrDelete('activityType', activityFilters.type, 'all');
    setOrDelete('activityStatus', activityFilters.status, 'all');
    setOrDelete('todoRepo', todoFilter.repoIds?.[0], 'all');
    setOrDelete('todoStatus', todoFilter.status?.join(','), '');
    setOrDelete('todoAssignee', todoFilter.assignee, '');
    setOrDelete('todoSearch', todoSearch, '');

    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}`;
    window.history.replaceState({}, '', newUrl);

    setStorageItem<PersistedFilters>(storageKey, {
      activity: activityFilters,
      todo: {
        repoId: todoFilter.repoIds?.[0],
        status: todoFilter.status,
        assignee: todoFilter.assignee,
        searchQuery: todoSearch,
      },
    });
  }, [activityFilters, todoFilter, todoSearch, storageKey]);

  const handleOptimisticCreate = useCallback(
    (payload: ActivityIssueToTodoInput) => {
      const optimistic: Todo = {
        id: `optimistic-${payload.repoId}-${payload.issueNumber}-${Date.now()}`,
        title: payload.title,
        description: payload.description,
        repoId: payload.repoId,
        status: 'todo',
        priority: payload.priority,
        labels: payload.labels || [],
        assignee: payload.assignee,
        issueNumber: payload.issueNumber,
        issueUrl: payload.issueUrl,
        syncEnabled: payload.syncEnabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setOptimisticTodos((prev) => [optimistic, ...prev]);
      return () => {
        setOptimisticTodos((prev) => prev.filter((todo) => todo.id !== optimistic.id));
      };
    },
    []
  );

  const handleConvertIssue = useCallback(
    async (payload: ActivityIssueToTodoInput) => {
      const created = await createTodo(payload);
      setOptimisticTodos((prev) =>
        prev.filter(
          (todo) => !(todo.repoId === payload.repoId && todo.issueNumber === payload.issueNumber)
        )
      );
      setTodoRefreshToken((prev) => prev + 1);
      refreshTodos();
      return created;
    },
    [createTodo, refreshTodos]
  );

  const handleActivityFiltersChange = useCallback((next: ActivityPanelFilters) => {
    setActivityFilters(next);
  }, []);

  const handleTodoFilterChange = useCallback(
    (next: TodoFilter) => {
      setTodoFilter(next);
      setTodoSearch(next.searchQuery);
    },
    []
  );

  return (
    <div className="bg-surface-app px-inset-xl py-inset-lg space-y-6">
      <ActivitySummaryStats stats={summaryStats} periodLabel="直近7日" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <ActivityPanel
            issues={issues}
            pullRequests={pullRequests}
            isLoadingIssues={isLoadingActivities}
            isLoadingPullRequests={isLoadingActivities}
            initialFilters={activityFilters}
            onFiltersChange={handleActivityFiltersChange}
          />

          <section
            className="bg-surface-primary border border-[var(--border-subtle)] rounded-xl p-inset-md shadow-sm"
            role="region"
            aria-label="IssueをTODOに変換"
          >
            <header className="flex items-center justify-between mb-stack-sm">
              <div className="space-y-1">
                <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">
                  Issue を TODO に変換
                </h3>
                <p className="text-body-sm text-[var(--text-muted)]">
                  フィルターに一致する Issue を TODO 化できます。重複は自動で防止します。
                </p>
              </div>
              <span className="px-3 py-1 text-caption font-semibold rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {convertibleIssues.length} 件
              </span>
            </header>

            {convertibleIssues.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg bg-[var(--bg-tertiary)]">
                <span>変換可能な Issue がありません</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {convertibleIssues.map((issue) => (
                  <ActivityIssueCard
                    key={issue.id}
                    issue={issue}
                    existingTodos={mergedTodos}
                    onOptimisticCreate={handleOptimisticCreate}
                    onConvert={handleConvertIssue}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="xl:col-span-1">
          <TodoPanel
            repos={repos}
            className="h-full"
            initialFilter={todoFilter}
            initialSearchQuery={todoSearch}
            refreshToken={todoRefreshToken}
            onFilterChange={handleTodoFilterChange}
          />
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        TODOとアクティビティを同期しています
      </div>
    </div>
  );
};
