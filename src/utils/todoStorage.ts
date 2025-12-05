/**
 * ToDo storage utility for localStorage operations
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Todo,
  TodoStats,
  IssueSyncConfig,
  TodoFilter,
  TodoStatus,
} from '../types';
import { getStorageItem, setStorageItem } from './storage';

// Storage keys
const STORAGE_KEYS = {
  todos: (accountId: string) => `github-dashboard-todos:${accountId}`,
  syncConfig: (accountId: string) => `github-dashboard-issue-sync-config:${accountId}`,
  filter: (accountId: string) => `github-dashboard-todo-filter:${accountId}`,
  syncState: (accountId: string) => `github-dashboard-todo-sync-state:${accountId}`,
} as const;

// Constants
const MAX_TODOS = 500;
const ARCHIVE_DAYS = 30;
const DEFAULT_SYNC_CONFIG: IssueSyncConfig = {
  enabled: false,
  autoImport: false,
  autoClose: false,
  syncInterval: 15,
};

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isIsoDate(value: unknown): value is string {
  return isString(value) && !Number.isNaN(Date.parse(value));
}

function sanitizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((label): label is string => typeof label === 'string');
}

function sanitizeTodo(raw: unknown): Todo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Partial<Todo>;

  if (!isString(candidate.id) || !isString(candidate.title) || !isString(candidate.repoId)) {
    return null;
  }

  if (candidate.status !== 'todo' && candidate.status !== 'in_progress' && candidate.status !== 'done') {
    return null;
  }

  if (candidate.priority !== 'high' && candidate.priority !== 'medium' && candidate.priority !== 'low') {
    return null;
  }

  if (!isIsoDate(candidate.createdAt) || !isIsoDate(candidate.updatedAt)) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    description: isString(candidate.description) ? candidate.description : undefined,
    repoId: candidate.repoId,
    status: candidate.status,
    priority: candidate.priority,
    dueDate: isIsoDate(candidate.dueDate) ? candidate.dueDate : undefined,
    assignee: isString(candidate.assignee) ? candidate.assignee : undefined,
    labels: sanitizeLabels(candidate.labels),
    issueNumber: typeof candidate.issueNumber === 'number' ? candidate.issueNumber : undefined,
    issueUrl: isString(candidate.issueUrl) ? candidate.issueUrl : undefined,
    syncEnabled: Boolean(candidate.syncEnabled),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    completedAt: isIsoDate(candidate.completedAt) ? candidate.completedAt : undefined,
  };
}

function sanitizeTodos(rawTodos: Todo[]): Todo[] {
  const sanitized = rawTodos
    .map((todo) => sanitizeTodo(todo))
    .filter((todo): todo is Todo => todo !== null);
  return sanitized;
}

function normalizeIssueSyncConfig(value: unknown): IssueSyncConfig {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_SYNC_CONFIG };
  }
  const partial = value as Partial<IssueSyncConfig>;
  const syncInterval =
    typeof partial.syncInterval === 'number' && Number.isFinite(partial.syncInterval)
      ? partial.syncInterval
      : DEFAULT_SYNC_CONFIG.syncInterval;

  return {
    enabled: Boolean(partial.enabled),
    autoImport: Boolean(partial.autoImport),
    autoClose: Boolean(partial.autoClose),
    syncInterval,
    lastSyncAt: isIsoDate(partial.lastSyncAt) ? partial.lastSyncAt : undefined,
  };
}

function readTodos(accountId: string): Todo[] {
  const stored = getStorageItem<Todo[]>(STORAGE_KEYS.todos(accountId), []);
  const sanitized = sanitizeTodos(stored);
  if (sanitized.length !== stored.length) {
    // 壊れたデータを検知した場合は正規化した値で上書き
    setStorageItem(STORAGE_KEYS.todos(accountId), sanitized);
  }
  return sanitized;
}

/**
 * Get all ToDos for an account
 */
export function getTodos(accountId: string): Todo[] {
  return readTodos(accountId);
}

/**
 * Save all ToDos for an account
 */
export function saveTodos(accountId: string, todos: Todo[]): boolean {
  // Auto-archive old completed todos if exceeding limit
  let todosToSave = todos;
  if (todos.length > MAX_TODOS) {
    todosToSave = archiveOldCompletedTodos(todos, MAX_TODOS);
  }

  const sanitized = sanitizeTodos(todosToSave);
  return setStorageItem(STORAGE_KEYS.todos(accountId), sanitized);
}

/**
 * Create a new ToDo
 */
export function createTodo(
  accountId: string,
  data: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>
): Todo {
  const todos = getTodos(accountId);

  const newTodo: Todo = {
    ...data,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  todos.push(newTodo);
  saveTodos(accountId, todos);

  return newTodo;
}

/**
 * Update a ToDo
 */
export function updateTodo(
  accountId: string,
  todoId: string,
  updates: Partial<Todo>
): Todo | null {
  const todos = getTodos(accountId);
  const index = todos.findIndex((t) => t.id === todoId);

  if (index === -1) {
    return null;
  }

  const now = Date.now();
  const previousUpdatedAt = Date.parse(todos[index].updatedAt ?? '');
  const updatedAt =
    Number.isFinite(previousUpdatedAt) && previousUpdatedAt >= now
      ? new Date(previousUpdatedAt + 1).toISOString()
      : new Date(now).toISOString();

  const updatedTodo: Todo = {
    ...todos[index],
    ...updates,
    updatedAt,
    // If status changed to 'done', set completedAt
    completedAt:
      updates.status === 'done' && todos[index].status !== 'done'
        ? new Date().toISOString()
        : todos[index].completedAt,
  };

  todos[index] = updatedTodo;
  saveTodos(accountId, todos);

  return updatedTodo;
}

/**
 * Delete a ToDo
 */
export function deleteTodo(accountId: string, todoId: string): boolean {
  const todos = getTodos(accountId);
  const filteredTodos = todos.filter((t) => t.id !== todoId);

  if (filteredTodos.length === todos.length) {
    return false; // Todo not found
  }

  return saveTodos(accountId, filteredTodos);
}

/**
 * Get ToDos by repository
 */
export function getTodosByRepo(accountId: string, repoId: string): Todo[] {
  const todos = getTodos(accountId);
  return todos.filter((t) => t.repoId === repoId);
}

/**
 * Get a single ToDo by ID
 */
export function getTodoById(accountId: string, todoId: string): Todo | null {
  const todos = getTodos(accountId);
  return todos.find((t) => t.id === todoId) || null;
}

/**
 * Calculate ToDo statistics
 */
export function getTodoStats(accountId: string): TodoStats {
  const todos = getTodos(accountId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + 7);

  const stats: TodoStats = {
    total: todos.length,
    todo: 0,
    inProgress: 0,
    done: 0,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
  };

  for (const todo of todos) {
    // Count by status
    if (todo.status === 'todo') stats.todo++;
    else if (todo.status === 'in_progress') stats.inProgress++;
    else if (todo.status === 'done') stats.done++;

    // Count by due date (only for non-completed todos)
    if (todo.status !== 'done' && todo.dueDate) {
      const dueDate = new Date(todo.dueDate);

      if (dueDate < now) {
        stats.overdue++;
      } else if (dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
        stats.dueToday++;
      } else if (dueDate >= today && dueDate < thisWeekEnd) {
        stats.dueThisWeek++;
      }
    }
  }

  return stats;
}

/**
 * Get Issue sync configuration
 */
export function getIssueSyncConfig(accountId: string): IssueSyncConfig {
  const raw = getStorageItem<Partial<IssueSyncConfig>>(STORAGE_KEYS.syncConfig(accountId), DEFAULT_SYNC_CONFIG);
  const normalized = normalizeIssueSyncConfig(raw);
  // Persist normalized config if it differs from raw shape
  setStorageItem(STORAGE_KEYS.syncConfig(accountId), normalized);
  return normalized;
}

/**
 * Save Issue sync configuration
 */
export function saveIssueSyncConfig(
  accountId: string,
  config: IssueSyncConfig
): boolean {
  return setStorageItem(STORAGE_KEYS.syncConfig(accountId), config);
}

/**
 * Get ToDo filter settings
 */
export function getTodoFilter(accountId: string): TodoFilter {
  return getStorageItem<TodoFilter>(STORAGE_KEYS.filter(accountId), {});
}

/**
 * Save ToDo filter settings
 */
export function saveTodoFilter(accountId: string, filter: TodoFilter): boolean {
  return setStorageItem(STORAGE_KEYS.filter(accountId), filter);
}

/**
 * Get sync state
 */
export function getSyncState(accountId: string): {
  lastSyncAt?: string;
  syncInProgress: boolean;
} {
  return getStorageItem(STORAGE_KEYS.syncState(accountId), {
    syncInProgress: false,
  });
}

/**
 * Save sync state
 */
export function saveSyncState(
  accountId: string,
  state: { lastSyncAt?: string; syncInProgress: boolean }
): boolean {
  return setStorageItem(STORAGE_KEYS.syncState(accountId), state);
}

/**
 * Archive old completed todos
 * Removes completed todos that are older than ARCHIVE_DAYS
 */
function archiveOldCompletedTodos(todos: Todo[], maxCount: number): Todo[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_DAYS);

  // Filter out old completed todos
  const activeTodos = todos.filter((todo) => {
    if (todo.status !== 'done' || !todo.completedAt) {
      return true; // Keep non-completed todos
    }

    const completedDate = new Date(todo.completedAt);
    return completedDate > cutoffDate; // Keep recently completed todos
  });

  // If still over limit, sort by updatedAt and keep the most recent
  if (activeTodos.length > maxCount) {
    return activeTodos
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, maxCount);
  }

  return activeTodos;
}

/**
 * Get overdue todos
 */
export function getOverdueTodos(accountId: string): Todo[] {
  const todos = getTodos(accountId);
  const now = new Date();

  return todos.filter(
    (todo) =>
      todo.status !== 'done' &&
      todo.dueDate &&
      new Date(todo.dueDate) < now
  );
}

/**
 * Get todos due today
 */
export function getTodosDueToday(accountId: string): Todo[] {
  const todos = getTodos(accountId);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return todos.filter(
    (todo) =>
      todo.status !== 'done' &&
      todo.dueDate &&
      new Date(todo.dueDate) >= today &&
      new Date(todo.dueDate) < tomorrow
  );
}

/**
 * Bulk update todos
 */
export function bulkUpdateTodos(
  accountId: string,
  todoIds: string[],
  updates: Partial<Todo>
): Todo[] {
  const todos = getTodos(accountId);
  const updatedTodos: Todo[] = [];

  const updatedList = todos.map((todo) => {
    if (todoIds.includes(todo.id)) {
      const updated = {
        ...todo,
        ...updates,
        updatedAt: new Date().toISOString(),
        completedAt:
          updates.status === 'done' && todo.status !== 'done'
            ? new Date().toISOString()
            : todo.completedAt,
      };
      updatedTodos.push(updated);
      return updated;
    }
    return todo;
  });

  saveTodos(accountId, updatedList);
  return updatedTodos;
}

/**
 * Clear all completed todos
 */
export function clearCompletedTodos(accountId: string): boolean {
  const todos = getTodos(accountId);
  const activeTodos = todos.filter((todo) => todo.status !== 'done');
  return saveTodos(accountId, activeTodos);
}
