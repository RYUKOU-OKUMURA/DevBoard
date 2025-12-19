/**
 * TodoList component - Display a list of todos with grouping and filtering
 */

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Todo } from '../types';
import { TodoItem } from './TodoItem';
import { focusRing } from '../lib/focusRing';

interface TodoListProps {
  todos: Todo[];
  repoMap?: Map<string, string>; // Map of repoId -> repoName
  groupBy?: 'none' | 'repo' | 'status' | 'priority';
  onUpdate: (todoId: string, updates: Partial<Todo>) => void;
  onDelete: (todoId: string) => void;
  onClick: (todo: Todo) => void;
  onCreate?: () => void;
  emptyMessage?: string;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  repoMap,
  groupBy = 'none',
  onUpdate,
  onDelete,
  onClick,
  onCreate,
  emptyMessage = 'ToDoがありません',
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const safeRepoMap = useMemo(
    () => repoMap ?? new Map<string, string>(),
    [repoMap]
  );

  // Group todos
  const groups = useMemo(() => groupTodos(todos, groupBy), [todos, groupBy]);

  // Toggle group expansion
  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // Empty state
  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-stack-2xl text-center">
        <div className="text-display-sm text-[var(--text-tertiary)] mb-stack-md">
          📝
        </div>
        <p className="text-body text-[var(--text-secondary)] mb-stack-lg">
          {emptyMessage}
        </p>
        {onCreate && (
          <button
            onClick={onCreate}
            className={`
              px-4 py-2 rounded-lg
              bg-[var(--accent-green)]
              text-white font-medium
              hover:bg-[var(--accent-green-hover)]
              transition-colors
              ${focusRing.default}
            `}
          >
            最初のToDoを作成
          </button>
        )}
      </div>
    );
  }

  // Render ungrouped list
  if (groupBy === 'none') {
    return (
      <div className="space-y-stack-sm">
        <AnimatePresence>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onUpdate={(updates) => onUpdate(todo.id, updates)}
              onDelete={() => onDelete(todo.id)}
              onClick={() => onClick(todo)}
              showRepo={true}
              repoName={safeRepoMap.get(todo.repoId)}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Render grouped list
  return (
    <div className="space-y-stack-lg">
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.key) || expandedGroups.size === 0;

        return (
          <div key={group.key} className="space-y-stack-sm">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.key)}
              className={`
                w-full flex items-center justify-between
                px-inset-md py-inset-sm
                bg-[var(--surface-secondary)]
                border border-[var(--border-subtle)]
                rounded-lg
                hover:bg-[var(--surface-tertiary)]
                transition-colors
                ${focusRing.default}
              `}
            >
              <div className="flex items-center gap-inline-sm">
                <span className="text-body-sm">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <h3 className="text-body font-medium text-[var(--text-primary)]">
                  {group.title}
                </h3>
                <span className="text-caption text-[var(--text-secondary)] bg-[var(--surface-primary)] px-2 py-1 rounded">
                  {group.todos.length}
                </span>
              </div>
              {group.doneCount !== undefined && (
                <span className="text-caption text-[var(--text-secondary)]">
                  {group.doneCount} / {group.totalCount} 完了
                </span>
              )}
            </button>

            {/* Group content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-stack-sm pl-inset-md"
                >
                  {group.todos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onUpdate={(updates) => onUpdate(todo.id, updates)}
                      onDelete={() => onDelete(todo.id)}
                      onClick={() => onClick(todo)}
                      showRepo={groupBy !== 'repo'}
                      repoName={safeRepoMap.get(todo.repoId)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Group todos by the specified key
 */
function groupTodos(
  todos: Todo[],
  groupBy: 'none' | 'repo' | 'status' | 'priority'
): Array<{
  key: string;
  title: string;
  todos: Todo[];
  totalCount: number;
  doneCount: number;
}> {
  if (groupBy === 'none') {
    return [];
  }

  const groups = new Map<
    string,
    {
      key: string;
      title: string;
      todos: Todo[];
      totalCount: number;
      doneCount: number;
    }
  >();

  for (const todo of todos) {
    let groupKey = '';
    let groupTitle = '';

    switch (groupBy) {
      case 'repo':
        groupKey = todo.repoId;
        groupTitle = todo.repoId;
        break;

      case 'status':
        groupKey = todo.status;
        groupTitle = getStatusLabel(todo.status);
        break;

      case 'priority':
        groupKey = todo.priority;
        groupTitle = getPriorityLabel(todo.priority);
        break;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        title: groupTitle,
        todos: [],
        totalCount: 0,
        doneCount: 0,
      });
    }

    const group = groups.get(groupKey)!;
    group.todos.push(todo);
    group.totalCount++;
    if (todo.status === 'done') {
      group.doneCount++;
    }
  }

  // Sort groups
  const sortedGroups = Array.from(groups.values());

  if (groupBy === 'status') {
    // Custom order for status: todo -> in_progress -> done
    const statusOrder = { todo: 0, in_progress: 1, done: 2 };
    sortedGroups.sort(
      (a, b) =>
        statusOrder[a.key as keyof typeof statusOrder] -
        statusOrder[b.key as keyof typeof statusOrder]
    );
  } else if (groupBy === 'priority') {
    // Custom order for priority: high -> medium -> low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    sortedGroups.sort(
      (a, b) =>
        priorityOrder[a.key as keyof typeof priorityOrder] -
        priorityOrder[b.key as keyof typeof priorityOrder]
    );
  } else {
    // Alphabetical order for repo
    sortedGroups.sort((a, b) => a.title.localeCompare(b.title));
  }

  return sortedGroups;
}

/**
 * Get status label
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'todo':
      return '未着手';
    case 'in_progress':
      return '進行中';
    case 'done':
      return '完了';
    default:
      return status;
  }
}

/**
 * Get priority label
 */
function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return priority;
  }
}
