import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Repo, Todo, TodoStatus } from '../types';
import { TodoColumn } from './TodoColumn';
import { TodoCard } from './TodoCard';
import { TodoDetail } from './TodoDetail';
import { focusRing } from '../lib/focusRing';
import { useTodos } from '../hooks/useTodos';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface TodoPanelProps {
  repos: Repo[];
  initialLimit?: number;
  className?: string;
}

const statusLabel: Record<TodoStatus, string> = {
  todo: '未着手',
  in_progress: '進行中',
  done: '完了',
};

const statusOrder: TodoStatus[] = ['todo', 'in_progress', 'done'];

export const TodoPanel: React.FC<TodoPanelProps> = ({
  repos,
  initialLimit = 100,
  className = '',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { todos, isLoading, filter, setFilter, updateTodo, refresh } = useTodos({
    autoLoad: true,
  });

  const [visibleCount, setVisibleCount] = useState(initialLimit);
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [assigneeInitialized, setAssigneeInitialized] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const repoMap = useMemo(() => {
    const map = new Map<string, string>();
    repos.forEach((repo) => map.set(repo.id, repo.nameWithOwner));
    return map;
  }, [repos]);

  const limitedTodos = useMemo(
    () => todos.slice(0, visibleCount),
    [todos, visibleCount]
  );

  const todosByStatus = useMemo(() => {
    const grouped: Record<TodoStatus, Todo[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const todo of limitedTodos) {
      grouped[todo.status].push(todo);
    }
    return grouped;
  }, [limitedTodos]);

  const activeFilterBadges = useMemo(() => {
    const badges: Array<{ label: string; value: string }> = [];
    if (filter.repoIds?.[0]) {
      badges.push({
        label: 'リポジトリ',
        value: repoMap.get(filter.repoIds[0]) || '選択中',
      });
    }
    if (filter.status?.length) {
      badges.push({
        label: 'ステータス',
        value: filter.status.map((s) => statusLabel[s]).join(', '),
      });
    }
    if (filter.assignee) {
      badges.push({ label: '担当', value: filter.assignee });
    }
    if (filter.searchQuery) {
      badges.push({ label: '検索', value: filter.searchQuery });
    }
    return badges;
  }, [filter, repoMap]);

  // デフォルトの担当フィルターを自分に合わせる（初回のみ）
  useEffect(() => {
    if (!assigneeInitialized && user?.username && !filter.assignee) {
      setFilter({ ...filter, assignee: user.username });
      setAssigneeInitialized(true);
    } else if (!assigneeInitialized && !user?.username) {
      setAssigneeInitialized(true);
    }
  }, [assigneeInitialized, user?.username, filter, setFilter]);

  const resetVisibleCount = useCallback(
    () => setVisibleCount(initialLimit),
    [initialLimit]
  );

  const cleanAndSetFilter = useCallback(
    (nextFilter: typeof filter) => {
      const cleaned = { ...nextFilter };
      if (cleaned.status && cleaned.status.length === 0) delete cleaned.status;
      if (cleaned.repoIds && cleaned.repoIds.length === 0) delete cleaned.repoIds;
      if (!cleaned.assignee) delete cleaned.assignee;
      if (!cleaned.searchQuery) delete cleaned.searchQuery;
      setFilter(cleaned);
      resetVisibleCount();
    },
    [resetVisibleCount, setFilter]
  );

  const handleRepoChange = (repoId: string) => {
    cleanAndSetFilter({
      ...filter,
      repoIds: repoId === 'all' ? undefined : [repoId],
    });
  };

  const handleStatusToggle = (status: TodoStatus) => {
    const current = filter.status || [];
    const nextStatuses = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    cleanAndSetFilter({
      ...filter,
      status: nextStatuses.length ? nextStatuses : undefined,
    });
  };

  const handleAssigneeChange = (assignee: string | undefined) => {
    cleanAndSetFilter({
      ...filter,
      assignee: assignee || undefined,
    });
  };

  const handleSearchChange = (search: string) => {
    cleanAndSetFilter({
      ...filter,
      searchQuery: search || undefined,
    });
  };

  const handleClearFilters = () => {
    cleanAndSetFilter({
      assignee: user?.username || undefined,
    });
  };

  const setTodoLoading = (todoId: string, loading: boolean) => {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      if (loading) {
        next.add(todoId);
      } else {
        next.delete(todoId);
      }
      return next;
    });
  };

  const handleStatusUpdate = async (todoId: string, newStatus: TodoStatus) => {
    const target = todos.find((t) => t.id === todoId);
    if (!target) return;

    setTodoLoading(todoId, true);
    try {
      await updateTodo(todoId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
      });
      showToast({
        variant: 'success',
        title: 'ステータスを更新しました',
        description: `「${target.title}」を${statusLabel[newStatus]}に移動`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'ステータス更新に失敗しました';
      showToast({
        variant: 'error',
        title: '更新に失敗しました',
        description: message,
      });
    } finally {
      setTodoLoading(todoId, false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const todo = todos.find((t) => t.id === active.id);
    setActiveTodo(todo || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTodo(null);

    if (!over) return;
    const todoId = String(active.id);
    const newStatus = over.id as TodoStatus;

    const todo = todos.find((t) => t.id === todoId);
    if (!todo || todo.status === newStatus) return;

    handleStatusUpdate(todoId, newStatus);
  };

  const handleTodoClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setIsDetailOpen(true);
  };

  const handleDetailSave = async (todoId: string, updates: Partial<Todo>) => {
    setTodoLoading(todoId, true);
    try {
      const updatePayload: Partial<Todo> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      if (updates.status) {
        updatePayload.completedAt =
          updates.status === 'done' ? new Date().toISOString() : undefined;
      }
      await updateTodo(todoId, updatePayload);
      showToast({
        variant: 'success',
        title: 'TODOを更新しました',
        description: updates.status
          ? `ステータス: ${statusLabel[updates.status as TodoStatus]}`
          : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新に失敗しました';
      showToast({
        variant: 'error',
        title: '更新に失敗しました',
        description: message,
      });
    } finally {
      setTodoLoading(todoId, false);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 50, todos.length));
  };

  const filteredCountText = `表示 ${limitedTodos.length} 件 / 全 ${todos.length} 件`;

  return (
    <div
      className={`
        bg-surface-primary
        border border-[var(--border-subtle)]
        rounded-2xl
        p-inset-lg
        shadow-sm
        space-y-4
        ${className}
      `.trim()}
      role="region"
      aria-label="TODOパネル"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-title-2 font-semibold text-[var(--text-primary)]">
              My TODOs
            </span>
            <span className="px-2 py-0.5 rounded-full text-caption font-semibold bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
              {filteredCountText}
            </span>
          </div>
          <p className="text-body-sm text-[var(--text-muted)]">
            アカウント横断のタスクを3列カンバンで整理。ドラッグ&ドロップでステータスを変更できます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className={`
              inline-flex items-center gap-1 px-3 py-2
              rounded-lg border border-[var(--border-subtle)]
              bg-[var(--bg-secondary)]
              text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              transition-colors
              ${focusRing.default}
            `}
            aria-label="TODOを再読み込み"
          >
            <span aria-hidden>⟳</span>
            <span>再読み込み</span>
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className={`
              inline-flex items-center gap-1 px-3 py-2
              rounded-lg border border-[var(--border-subtle)]
              bg-[var(--bg-secondary)]
              text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              transition-colors
              ${focusRing.default}
            `}
            aria-label="フィルターをリセット"
          >
            <span aria-hidden>✕</span>
            <span>フィルターをリセット</span>
          </button>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl p-inset-md"
        role="group"
        aria-label="TODOフィルター"
      >
        <div className="flex items-center gap-2 min-w-[220px]">
          <label className="text-caption text-[var(--text-secondary)]" htmlFor="todo-repo-filter">
            リポジトリ
          </label>
          <select
            id="todo-repo-filter"
            value={filter.repoIds?.[0] || 'all'}
            onChange={(e) => handleRepoChange(e.target.value)}
            className={`
              flex-1
              rounded-lg border border-[var(--border-subtle)]
              bg-[var(--bg-primary)]
              text-body-sm text-[var(--text-primary)]
              px-3 py-2
              ${focusRing.default}
            `}
          >
            <option value="all">すべて</option>
            {repos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.nameWithOwner}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption text-[var(--text-secondary)]">ステータス</span>
          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-1">
            {statusOrder.map((value) => {
              const isActive = filter.status?.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusToggle(value)}
                  className={`
                    px-3 py-1.5 text-body-sm font-medium rounded-md
                    transition-colors
                    ${isActive
                      ? 'bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
                    ${focusRing.default}
                  `}
                  aria-pressed={isActive}
                >
                  {statusLabel[value]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-caption text-[var(--text-secondary)]">担当</span>
          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-1">
            <button
              type="button"
              onClick={() => handleAssigneeChange(user?.username)}
              className={`
                px-3 py-1.5 text-body-sm font-medium rounded-md
                transition-colors
                ${filter.assignee === user?.username
                  ? 'bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
                ${focusRing.default}
              `}
              aria-pressed={filter.assignee === user?.username}
            >
              自分
            </button>
            <button
              type="button"
              onClick={() => handleAssigneeChange(undefined)}
              className={`
                px-3 py-1.5 text-body-sm font-medium rounded-md
                transition-colors
                ${!filter.assignee
                  ? 'bg-[var(--accent-blue-muted)] text-[var(--accent-blue-emphasis)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'}
                ${focusRing.default}
              `}
              aria-pressed={!filter.assignee}
            >
              すべて
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          <label className="sr-only" htmlFor="todo-search">
            TODO検索
          </label>
          <input
            id="todo-search"
            type="search"
            value={filter.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="タイトル・説明で検索"
            className={`
              w-full px-3 py-2
              rounded-lg border border-[var(--border-subtle)]
              bg-[var(--bg-primary)]
              text-body-sm text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)]
              ${focusRing.default}
            `}
          />
        </div>
      </div>

      {activeFilterBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="適用中のフィルター">
          {activeFilterBadges.map((badge) => (
            <span
              key={`${badge.label}-${badge.value}`}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-caption bg-[var(--accent-green-muted)] text-[var(--accent-green-emphasis)] border border-[var(--accent-green-border)]"
            >
              <span className="font-semibold">{badge.label}:</span>
              <span>{badge.value}</span>
            </span>
          ))}
        </div>
      )}

      <div className="sr-only" aria-live="polite">
        {activeFilterBadges.length
          ? `フィルター適用中: ${activeFilterBadges
              .map((badge) => `${badge.label} ${badge.value}`)
              .join(', ')}。${filteredCountText}`
          : `フィルターなし。${filteredCountText}`}
      </div>

      <div className="min-h-[320px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-green-muted)] border-b-[var(--accent-green)] animate-spin" aria-hidden />
              <span className="text-body-sm">TODOを読み込み中...</span>
            </div>
          </div>
        ) : limitedTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--bg-tertiary)] text-center">
            <span className="text-display-sm mb-2 opacity-40" aria-hidden>
              ✅
            </span>
            <p className="text-body text-[var(--text-primary)]">表示するTODOがありません</p>
            <p className="text-body-sm text-[var(--text-muted)] mt-1">
              フィルターや検索条件を見直してください。
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {statusOrder.map((status) => (
                <section
                  key={status}
                  role="region"
                  aria-label={`${statusLabel[status]}カラム`}
                  className="bg-[var(--bg-secondary)] rounded-xl p-inset-sm border border-[var(--border-subtle)] shadow-sm"
                >
                  <TodoColumn
                    status={status}
                    todos={todosByStatus[status]}
                    repoMap={repoMap}
                    onTodoClick={handleTodoClick}
                    busyTodoIds={updatingIds}
                  />
                  {todosByStatus[status].length > 0 && (
                    <p className="text-caption text-[var(--text-tertiary)] mt-2 px-1">
                      {todosByStatus[status].length} 件表示中
                    </p>
                  )}
                </section>
              ))}
            </div>

            <DragOverlay>
              {activeTodo && (
                <div className="rotate-3 opacity-90">
                  <TodoCard
                    todo={activeTodo}
                    onClick={() => {}}
                    repoName={repoMap.get(activeTodo.repoId)}
                    isDragging={true}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {todos.length > visibleCount && (
        <div className="flex items-center justify-between bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-4 py-3">
          <div className="text-body-sm text-[var(--text-secondary)]">
            {filteredCountText}（{visibleCount} 件まで表示中）
          </div>
          <button
            type="button"
            onClick={handleLoadMore}
            className={`
              inline-flex items-center gap-2 px-4 py-2
              rounded-lg border border-[var(--border-subtle)]
              bg-[var(--bg-primary)]
              text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              transition-colors
              ${focusRing.default}
            `}
            aria-label="TODOをさらに読み込む"
          >
            <span aria-hidden>＋</span>
            <span>さらに表示</span>
          </button>
        </div>
      )}

      {selectedTodo && (
        <TodoDetail
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTodo(null);
          }}
          todo={selectedTodo}
          onSave={(todoId, updates) => handleDetailSave(todoId, updates)}
          repoName={repoMap.get(selectedTodo.repoId)}
        />
      )}

      {/* カード更新中の視覚フィードバック */}
      <div className="sr-only" aria-live="polite">
        {updatingIds.size > 0 ? 'TODOを更新しています' : '最新の状態です'}
      </div>
    </div>
  );
};

export default TodoPanel;
