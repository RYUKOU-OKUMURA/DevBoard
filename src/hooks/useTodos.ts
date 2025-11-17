/**
 * Custom hook for ToDo operations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Todo,
  TodoStats,
  IssueSyncConfig,
  TodoFilter,
  TodoSort,
} from '../types';
import {
  getTodos,
  createTodo as createTodoStorage,
  updateTodo as updateTodoStorage,
  deleteTodo as deleteTodoStorage,
  getTodosByRepo,
  getTodoStats,
  getIssueSyncConfig,
  saveIssueSyncConfig,
  getTodoFilter,
  saveTodoFilter,
  getOverdueTodos,
  getTodosDueToday,
  bulkUpdateTodos,
  clearCompletedTodos,
} from '../utils/todoStorage';
import {
  importIssuesFromGitHub,
  createIssueFromTodo as createIssueFromTodoSync,
  syncTodosWithIssues,
  exportTodoAsIssue,
} from '../utils/issueSync';
import { useAuth } from './useAuth';

/**
 * Hook options
 */
interface UseTodosOptions {
  repoId?: string; // Filter by repository
  autoLoad?: boolean; // Auto-load on mount (default: true)
  filter?: TodoFilter; // Initial filter
  sort?: TodoSort; // Initial sort
}

/**
 * Hook return type
 */
interface UseTodosReturn {
  // Data
  todos: Todo[];
  stats: TodoStats | null;
  syncConfig: IssueSyncConfig | null;
  filter: TodoFilter;
  sort: TodoSort;

  // Loading states
  isLoading: boolean;
  isSyncing: boolean;

  // CRUD operations
  createTodo: (data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Todo>;
  updateTodo: (todoId: string, updates: Partial<Todo>) => Promise<Todo | null>;
  deleteTodo: (todoId: string) => Promise<boolean>;
  bulkUpdate: (todoIds: string[], updates: Partial<Todo>) => Promise<Todo[]>;
  clearCompleted: () => Promise<boolean>;

  // Issue sync operations
  createIssueFromTodo: (todoId: string, repositoryId: string) => Promise<{ number: number; url: string } | null>;
  importIssues: (repoNameWithOwner: string, issueNumbers?: number[]) => Promise<Todo[]>;
  syncWithGitHub: (repoNameWithOwner: string) => Promise<void>;
  exportAsIssue: (todoId: string, repositoryId: string) => Promise<{ number: number; url: string } | null>;

  // Sync config
  updateSyncConfig: (config: Partial<IssueSyncConfig>) => void;

  // Filter & Sort
  setFilter: (filter: TodoFilter) => void;
  setSort: (sort: TodoSort) => void;

  // Utility
  refresh: () => void;
  getOverdue: () => Todo[];
  getDueToday: () => Todo[];
}

/**
 * Custom hook for ToDo operations
 */
export function useTodos(options: UseTodosOptions = {}): UseTodosReturn {
  const {
    repoId,
    autoLoad = true,
    filter: initialFilter = {},
    sort: initialSort = 'priority',
  } = options;

  const { user } = useAuth();
  const accountId = user?.userId || '';

  // State
  const [todos, setTodos] = useState<Todo[]>([]);
  const [stats, setStats] = useState<TodoStats | null>(null);
  const [syncConfig, setSyncConfig] = useState<IssueSyncConfig | null>(null);
  const [filter, setFilterState] = useState<TodoFilter>(initialFilter);
  const [sort, setSortState] = useState<TodoSort>(initialSort);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  /**
   * Load todos from storage
   */
  const loadTodos = useCallback(() => {
    if (!accountId) return;

    setIsLoading(true);
    try {
      const allTodos = repoId
        ? getTodosByRepo(accountId, repoId)
        : getTodos(accountId);

      // Apply filter
      const filteredTodos = applyFilter(allTodos, filter);

      // Apply sort
      const sortedTodos = applySortOrder(filteredTodos, sort);

      setTodos(sortedTodos);

      // Load stats
      const todoStats = getTodoStats(accountId);
      setStats(todoStats);

      // Load sync config
      const config = getIssueSyncConfig(accountId);
      setSyncConfig(config);

      // Load saved filter
      const savedFilter = getTodoFilter(accountId);
      if (Object.keys(savedFilter).length > 0) {
        setFilterState(savedFilter);
      }
    } finally {
      setIsLoading(false);
    }
  }, [accountId, repoId, filter, sort]);

  /**
   * Create a new todo
   */
  const createTodo = useCallback(
    async (data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>): Promise<Todo> => {
      if (!accountId) throw new Error('Not authenticated');

      const newTodo = createTodoStorage(accountId, data);
      loadTodos();
      return newTodo;
    },
    [accountId, loadTodos]
  );

  /**
   * Update a todo
   */
  const updateTodo = useCallback(
    async (todoId: string, updates: Partial<Todo>): Promise<Todo | null> => {
      if (!accountId) throw new Error('Not authenticated');

      const updatedTodo = updateTodoStorage(accountId, todoId, updates);
      loadTodos();
      return updatedTodo;
    },
    [accountId, loadTodos]
  );

  /**
   * Delete a todo
   */
  const deleteTodo = useCallback(
    async (todoId: string): Promise<boolean> => {
      if (!accountId) throw new Error('Not authenticated');

      const success = deleteTodoStorage(accountId, todoId);
      if (success) {
        loadTodos();
      }
      return success;
    },
    [accountId, loadTodos]
  );

  /**
   * Bulk update todos
   */
  const bulkUpdate = useCallback(
    async (todoIds: string[], updates: Partial<Todo>): Promise<Todo[]> => {
      if (!accountId) throw new Error('Not authenticated');

      const updatedTodos = bulkUpdateTodos(accountId, todoIds, updates);
      loadTodos();
      return updatedTodos;
    },
    [accountId, loadTodos]
  );

  /**
   * Clear completed todos
   */
  const clearCompleted = useCallback(async (): Promise<boolean> => {
    if (!accountId) throw new Error('Not authenticated');

    const success = clearCompletedTodos(accountId);
    if (success) {
      loadTodos();
    }
    return success;
  }, [accountId, loadTodos]);

  /**
   * Create GitHub issue from todo
   */
  const createIssueFromTodo = useCallback(
    async (
      todoId: string,
      repositoryId: string
    ): Promise<{ number: number; url: string } | null> => {
      if (!accountId) throw new Error('Not authenticated');

      setIsSyncing(true);
      try {
        const todo = todos.find((t) => t.id === todoId);
        if (!todo) return null;

        const result = await createIssueFromTodoSync(accountId, todo, repositoryId);
        loadTodos();
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [accountId, todos, loadTodos]
  );

  /**
   * Import issues from GitHub
   */
  const importIssues = useCallback(
    async (repoNameWithOwner: string, issueNumbers?: number[]): Promise<Todo[]> => {
      if (!accountId || !repoId) throw new Error('Not authenticated or repo not specified');

      setIsSyncing(true);
      try {
        const importedTodos = await importIssuesFromGitHub(
          accountId,
          repoId,
          repoNameWithOwner,
          issueNumbers
        );
        loadTodos();
        return importedTodos;
      } finally {
        setIsSyncing(false);
      }
    },
    [accountId, repoId, loadTodos]
  );

  /**
   * Sync todos with GitHub issues
   */
  const syncWithGitHub = useCallback(
    async (repoNameWithOwner: string): Promise<void> => {
      if (!accountId || !repoId) throw new Error('Not authenticated or repo not specified');

      setIsSyncing(true);
      try {
        await syncTodosWithIssues(accountId, repoId, repoNameWithOwner);
        loadTodos();
      } finally {
        setIsSyncing(false);
      }
    },
    [accountId, repoId, loadTodos]
  );

  /**
   * Export todo as GitHub issue
   */
  const exportAsIssue = useCallback(
    async (
      todoId: string,
      repositoryId: string
    ): Promise<{ number: number; url: string } | null> => {
      if (!accountId) throw new Error('Not authenticated');

      setIsSyncing(true);
      try {
        const result = await exportTodoAsIssue(accountId, todoId, repositoryId);
        loadTodos();
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [accountId, loadTodos]
  );

  /**
   * Update sync configuration
   */
  const updateSyncConfig = useCallback(
    (config: Partial<IssueSyncConfig>) => {
      if (!accountId) return;

      const currentConfig = syncConfig || {
        enabled: false,
        autoImport: false,
        autoClose: false,
        syncInterval: 15,
      };

      const newConfig = { ...currentConfig, ...config };
      saveIssueSyncConfig(accountId, newConfig);
      setSyncConfig(newConfig);
    },
    [accountId, syncConfig]
  );

  /**
   * Set filter
   */
  const setFilter = useCallback(
    (newFilter: TodoFilter) => {
      setFilterState(newFilter);
      if (accountId) {
        saveTodoFilter(accountId, newFilter);
      }
      loadTodos();
    },
    [accountId, loadTodos]
  );

  /**
   * Set sort
   */
  const setSort = useCallback(
    (newSort: TodoSort) => {
      setSortState(newSort);
      loadTodos();
    },
    [loadTodos]
  );

  /**
   * Get overdue todos
   */
  const getOverdue = useCallback((): Todo[] => {
    if (!accountId) return [];
    return getOverdueTodos(accountId);
  }, [accountId]);

  /**
   * Get todos due today
   */
  const getDueToday = useCallback((): Todo[] => {
    if (!accountId) return [];
    return getTodosDueToday(accountId);
  }, [accountId]);

  /**
   * Refresh todos
   */
  const refresh = useCallback(() => {
    loadTodos();
  }, [loadTodos]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && accountId) {
      loadTodos();
    }
  }, [autoLoad, accountId, loadTodos]);

  return {
    todos,
    stats,
    syncConfig,
    filter,
    sort,
    isLoading,
    isSyncing,
    createTodo,
    updateTodo,
    deleteTodo,
    bulkUpdate,
    clearCompleted,
    createIssueFromTodo,
    importIssues,
    syncWithGitHub,
    exportAsIssue,
    updateSyncConfig,
    setFilter,
    setSort,
    refresh,
    getOverdue,
    getDueToday,
  };
}

/**
 * Apply filter to todos
 */
function applyFilter(todos: Todo[], filter: TodoFilter): Todo[] {
  let filtered = todos;

  // Status filter
  if (filter.status && filter.status.length > 0) {
    filtered = filtered.filter((todo) => filter.status!.includes(todo.status));
  }

  // Priority filter
  if (filter.priority && filter.priority.length > 0) {
    filtered = filtered.filter((todo) => filter.priority!.includes(todo.priority));
  }

  // Repository filter
  if (filter.repoIds && filter.repoIds.length > 0) {
    filtered = filtered.filter((todo) => filter.repoIds!.includes(todo.repoId));
  }

  // Assignee filter
  if (filter.assignee) {
    filtered = filtered.filter((todo) => todo.assignee === filter.assignee);
  }

  // Label filter
  if (filter.labels && filter.labels.length > 0) {
    filtered = filtered.filter((todo) =>
      filter.labels!.some((label) => todo.labels.includes(label))
    );
  }

  // Due date range filter
  if (filter.dueDateRange) {
    const { start, end } = filter.dueDateRange;
    filtered = filtered.filter((todo) => {
      if (!todo.dueDate) return false;
      const dueDate = new Date(todo.dueDate);
      if (start && dueDate < new Date(start)) return false;
      if (end && dueDate > new Date(end)) return false;
      return true;
    });
  }

  // Search query filter
  if (filter.searchQuery) {
    const query = filter.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (todo) =>
        todo.title.toLowerCase().includes(query) ||
        todo.description?.toLowerCase().includes(query)
    );
  }

  return filtered;
}

/**
 * Apply sort order to todos
 */
function applySortOrder(todos: Todo[], sort: TodoSort): Todo[] {
  const sorted = [...todos];

  switch (sort) {
    case 'priority':
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      break;

    case 'dueDate':
      sorted.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      break;

    case 'createdAt':
      sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      break;

    case 'updatedAt':
      sorted.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      break;

    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  return sorted;
}

/**
 * Hook to use auth context
 */
function useAuth() {
  const context = require('../contexts/AuthContext').useAuth();
  return context;
}
