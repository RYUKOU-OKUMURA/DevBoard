/**
 * TodosTab - TODO management tab for workspace
 * Displays todos filtered by the selected repository
 */

import React, { useState, useCallback } from 'react';
import { useTodos } from '../../hooks/useTodos';
import { focusRing } from '../../lib/focusRing';
import type { Todo, TodoStatus, TodoPriority } from '../../types';

interface TodosTabProps {
  repoId: string;
  repoName: string;
}

const STATUS_CONFIG: Record<TodoStatus, { label: string; color: string; bgColor: string }> = {
  todo: { label: '未着手', color: 'text-[var(--text-secondary)]', bgColor: 'bg-[var(--bg-tertiary)]' },
  in_progress: { label: '進行中', color: 'text-[var(--accent-blue-emphasis)]', bgColor: 'bg-[var(--accent-blue-muted)]' },
  done: { label: '完了', color: 'text-[var(--accent-green-emphasis)]', bgColor: 'bg-[var(--accent-green-muted)]' },
};

const PRIORITY_CONFIG: Record<TodoPriority, { label: string; color: string; icon: string }> = {
  high: { label: 'H', color: '#EF4444', icon: '🔴' },
  medium: { label: 'M', color: '#F97316', icon: '🟠' },
  low: { label: 'L', color: '#3B82F6', icon: '🔵' },
};

export const TodosTab: React.FC<TodosTabProps> = ({
  repoId,
  repoName,
}) => {
  const {
    todos,
    isLoading,
    isSyncing,
    createTodo,
    updateTodo,
    deleteTodo,
    createIssueFromTodo,
    refresh,
  } = useTodos({ repoId, autoLoad: true });

  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoPriority>('medium');
  const [isComposing, setIsComposing] = useState(false);

  const handleCreateTodo = useCallback(async () => {
    if (!newTodoTitle.trim()) return;

    try {
      await createTodo({
        title: newTodoTitle.trim(),
        description: '',
        status: 'todo',
        priority: newTodoPriority,
        repoId,
        labels: [],
        syncEnabled: false,
      });
      setNewTodoTitle('');
      setIsAddingTodo(false);
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  }, [createTodo, newTodoTitle, newTodoPriority, repoId]);

  const handleStatusChange = useCallback(async (todoId: string, newStatus: TodoStatus) => {
    await updateTodo(todoId, { status: newStatus });
  }, [updateTodo]);

  const handleDeleteTodo = useCallback(async (todoId: string) => {
    if (window.confirm('このTODOを削除してもよろしいですか？')) {
      await deleteTodo(todoId);
    }
  }, [deleteTodo]);

  const handleCreateIssue = useCallback(async (todoId: string) => {
    try {
      const result = await createIssueFromTodo(todoId, repoId);
      if (result) {
        // Issue created successfully
        console.log('Issue created:', result);
      }
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  }, [createIssueFromTodo, repoId]);

  // Group todos by status
  const todosByStatus = React.useMemo(() => {
    const grouped: Record<TodoStatus, Todo[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    todos.forEach((todo) => {
      grouped[todo.status].push(todo);
    });
    return grouped;
  }, [todos]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-4">
          <h3 className="text-title-3 font-semibold text-[var(--text-primary)]">TODO</h3>
          <span className="text-body-sm text-[var(--text-muted)]">
            {todos.length} 件
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className={`
              p-2 rounded-lg
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--bg-hover)]
              transition-colors
              disabled:opacity-50
              ${focusRing.default}
            `}
            title="更新"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsAddingTodo(true)}
            className={`
              flex items-center gap-2 px-3 py-1.5
              bg-[var(--accent-green)] text-white
              rounded-lg text-body-sm font-medium
              hover:bg-[var(--accent-green-emphasis)]
              transition-colors
              ${focusRing.default}
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            追加
          </button>
        </div>
      </div>

      {/* Add Todo Form */}
      {isAddingTodo && (
        <div className="flex-shrink-0 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <div className="flex gap-3">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                  e.preventDefault();
                  handleCreateTodo();
                }
                if (e.key === 'Escape') {
                  setIsAddingTodo(false);
                  setNewTodoTitle('');
                }
              }}
              placeholder="TODOのタイトルを入力..."
              className={`
                flex-1 px-3 py-2
                border border-[var(--border-subtle)]
                rounded-lg
                bg-[var(--bg-primary)]
                text-[var(--text-primary)]
                placeholder:text-[var(--text-muted)]
                focus:border-[var(--accent-green)]
                focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
                transition-colors
              `}
              autoFocus
            />
            <select
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(e.target.value as TodoPriority)}
              className={`
                px-3 py-2
                border border-[var(--border-subtle)]
                rounded-lg
                bg-[var(--bg-primary)]
                text-[var(--text-primary)]
                transition-colors
              `}
            >
              <option value="high">🔴 High</option>
              <option value="medium">🟠 Medium</option>
              <option value="low">🔵 Low</option>
            </select>
            <button
              onClick={handleCreateTodo}
              disabled={!newTodoTitle.trim()}
              className={`
                px-4 py-2
                bg-[var(--accent-green)] text-white
                rounded-lg font-medium
                hover:bg-[var(--accent-green-emphasis)]
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${focusRing.default}
              `}
            >
              追加
            </button>
            <button
              onClick={() => {
                setIsAddingTodo(false);
                setNewTodoTitle('');
              }}
              className={`
                px-4 py-2
                border border-[var(--border-subtle)]
                rounded-lg
                text-[var(--text-secondary)]
                hover:bg-[var(--bg-hover)]
                transition-colors
                ${focusRing.default}
              `}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Content - Kanban Style */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)] mx-auto mb-3" />
              <p className="text-body-sm text-[var(--text-muted)]">Loading...</p>
            </div>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-30 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-body-sm text-[var(--text-muted)] mb-2">TODOがありません</p>
              <p className="text-caption text-[var(--text-tertiary)]">{repoName}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* Todo Column */}
            <TodoColumn
              status="todo"
              todos={todosByStatus.todo}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTodo}
              onCreateIssue={handleCreateIssue}
              isSyncing={isSyncing}
              onUpdate={async (todoId, updates) => {
                await updateTodo(todoId, updates);
              }}
            />
            {/* In Progress Column */}
            <TodoColumn
              status="in_progress"
              todos={todosByStatus.in_progress}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTodo}
              onCreateIssue={handleCreateIssue}
              isSyncing={isSyncing}
              onUpdate={async (todoId, updates) => {
                await updateTodo(todoId, updates);
              }}
            />
            {/* Done Column */}
            <TodoColumn
              status="done"
              todos={todosByStatus.done}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteTodo}
              onCreateIssue={handleCreateIssue}
              isSyncing={isSyncing}
              onUpdate={async (todoId, updates) => {
                await updateTodo(todoId, updates);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface TodoColumnProps {
  status: TodoStatus;
  todos: Todo[];
  onStatusChange: (todoId: string, newStatus: TodoStatus) => void;
  onDelete: (todoId: string) => void;
  onCreateIssue?: (todoId: string) => void;
  isSyncing?: boolean;
  onUpdate: (todoId: string, updates: Partial<Todo>) => Promise<void> | void;
}

const TodoColumn: React.FC<TodoColumnProps> = ({
  status,
  todos,
  onStatusChange,
  onDelete,
  onCreateIssue,
  isSyncing,
  onUpdate,
}) => {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col min-h-0">
      {/* Column Header */}
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${config.bgColor}`}>
        <span className={`text-body-sm font-semibold ${config.color}`}>
          {config.label}
        </span>
        <span className={`text-caption ${config.color}`}>
          {todos.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-auto p-2 space-y-2 bg-[var(--bg-tertiary)] rounded-b-lg border border-t-0 border-[var(--border-subtle)]">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            onCreateIssue={onCreateIssue}
            isSyncing={isSyncing}
            onUpdate={onUpdate}
          />
        ))}
        {todos.length === 0 && (
          <div className="text-center py-8 text-caption text-[var(--text-muted)]">
            なし
          </div>
        )}
      </div>
    </div>
  );
};

interface TodoItemProps {
  todo: Todo;
  onStatusChange: (todoId: string, newStatus: TodoStatus) => void;
  onDelete: (todoId: string) => void;
  onCreateIssue?: (todoId: string) => void;
  isSyncing?: boolean;
  onUpdate: (todoId: string, updates: Partial<Todo>) => Promise<void> | void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onStatusChange,
  onDelete,
  onCreateIssue,
  isSyncing,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [draftPriority, setDraftPriority] = useState<TodoPriority>(todo.priority);
  const [draftDueDate, setDraftDueDate] = useState(todo.dueDate ? todo.dueDate.slice(0, 10) : '');
  const [isComposingEdit, setIsComposingEdit] = useState(false);

  const priorityConfig = PRIORITY_CONFIG[isEditing ? draftPriority : todo.priority];
  const isOverdue = todo.status !== 'done' && todo.dueDate && new Date(todo.dueDate) < new Date();

  const handleEditStart = () => {
    setDraftTitle(todo.title);
    setDraftPriority(todo.priority);
    setDraftDueDate(todo.dueDate ? todo.dueDate.slice(0, 10) : '');
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setDraftTitle(todo.title);
    setDraftPriority(todo.priority);
    setDraftDueDate(todo.dueDate ? todo.dueDate.slice(0, 10) : '');
  };

  const handleEditSave = async () => {
    const trimmedTitle = draftTitle.trim();
    if (!trimmedTitle) return;

    await onUpdate(todo.id, {
      title: trimmedTitle,
      priority: draftPriority,
      dueDate: draftDueDate ? draftDueDate : undefined,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`
        group/actions p-3 rounded-lg
        bg-[var(--bg-primary)]
        border border-[var(--border-subtle)]
        hover:border-[var(--accent-green-border)]
        hover:shadow-sm
        transition-all
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded text-caption font-medium border"
          style={{
            color: priorityConfig.color,
            borderColor: priorityConfig.color,
          }}
        >
          {priorityConfig.label}
        </span>

        <div
          className={`
            flex items-center gap-1
            transition-opacity
            ${isEditing ? 'opacity-100' : 'opacity-0 group-hover/actions:opacity-100'}
          `}
        >
          {/* Edit */}
          <button
            onClick={handleEditStart}
            className="relative group/icon p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
            title="編集"
            aria-label="編集"
            disabled={isEditing}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-2 14h2m-8-3l8-12 8 12" />
            </svg>
            <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[var(--bg-primary)] px-2 py-1 text-caption text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-lg opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 transition-opacity">
              編集
            </span>
          </button>
          {/* Status change buttons */}
          {todo.status !== 'todo' && (
            <button
              onClick={() => onStatusChange(todo.id, 'todo')}
              className="relative group/icon p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] disabled:opacity-50"
              title="未着手に戻す"
              aria-label="未着手に戻す"
              disabled={isEditing}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
              <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[var(--bg-primary)] px-2 py-1 text-caption text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-lg opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 transition-opacity">
                未着手に戻す
              </span>
            </button>
          )}
          {todo.status !== 'in_progress' && (
            <button
              onClick={() => onStatusChange(todo.id, 'in_progress')}
              className="relative group/icon p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--accent-blue)] disabled:opacity-50"
              title="進行中にする"
              aria-label="進行中にする"
              disabled={isEditing}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[var(--bg-primary)] px-2 py-1 text-caption text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-lg opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 transition-opacity">
                進行中にする
              </span>
            </button>
          )}
          {todo.status !== 'done' && (
            <button
              onClick={() => onStatusChange(todo.id, 'done')}
              className="relative group/icon p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--accent-green)] disabled:opacity-50"
              title="完了にする"
              aria-label="完了にする"
              disabled={isEditing}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[var(--bg-primary)] px-2 py-1 text-caption text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-lg opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 transition-opacity">
                完了にする
              </span>
            </button>
          )}
          {/* Create Issue button - only show if not already linked */}
          {!todo.issueNumber && onCreateIssue && (
            <button
              onClick={() => onCreateIssue(todo.id)}
              disabled={isSyncing}
              className="relative group/icon p-1 rounded hover:bg-[var(--accent-green-muted)] text-[var(--text-muted)] hover:text-[var(--accent-green)] disabled:opacity-50"
              title="GitHub Issueを作成"
              aria-label="GitHub Issueを作成"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[var(--bg-primary)] px-2 py-1 text-caption text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-lg opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 transition-opacity">
                GitHub Issueを作成
              </span>
            </button>
          )}
          <button
            onClick={() => onDelete(todo.id)}
            className="relative group/icon p-1 rounded hover:bg-[var(--accent-red-muted)] text-[var(--text-muted)] hover:text-[var(--accent-red)] disabled:opacity-50"
            title="削除"
            aria-label="削除"
            disabled={isEditing}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-md bg-[var(--bg-primary)] px-2 py-1 text-caption text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-lg opacity-0 group-hover/icon:opacity-100 group-focus-visible/icon:opacity-100 transition-opacity">
              削除
            </span>
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onCompositionStart={() => setIsComposingEdit(true)}
            onCompositionEnd={() => setIsComposingEdit(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isComposingEdit) {
                e.preventDefault();
                handleEditSave();
              }
              if (e.key === 'Escape') {
                handleEditCancel();
              }
            }}
            className={`
              w-full px-3 py-2
              border border-[var(--border-subtle)]
              rounded-lg
              bg-[var(--bg-primary)]
              text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)]
              focus:border-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
              transition-colors
            `}
            placeholder="タイトルを編集"
            autoFocus
          />
          <div className="flex gap-2">
            <select
              value={draftPriority}
              onChange={(e) => setDraftPriority(e.target.value as TodoPriority)}
              className={`
                flex-1 px-3 py-2
                border border-[var(--border-subtle)]
                rounded-lg
                bg-[var(--bg-primary)]
                text-[var(--text-primary)]
                transition-colors
              `}
            >
              <option value="high">🔴 高</option>
              <option value="medium">🟠 中</option>
              <option value="low">🔵 低</option>
            </select>
            <input
              type="date"
              value={draftDueDate}
              onChange={(e) => setDraftDueDate(e.target.value)}
              className={`
                w-40 px-3 py-2
                border border-[var(--border-subtle)]
                rounded-lg
                bg-[var(--bg-primary)]
                text-[var(--text-primary)]
                transition-colors
              `}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEditCancel}
              className={`
                flex-1 px-3 py-2
                border border-[var(--border-subtle)]
                rounded-lg
                text-[var(--text-secondary)]
                hover:bg-[var(--bg-hover)]
                transition-colors
                ${focusRing.default}
              `}
            >
              キャンセル
            </button>
            <button
              onClick={handleEditSave}
              disabled={!draftTitle.trim()}
              className={`
                flex-1 px-3 py-2
                bg-[var(--accent-green)] text-white
                rounded-lg font-medium
                hover:bg-[var(--accent-green-emphasis)]
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${focusRing.default}
              `}
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Title */}
          <p className={`text-body-sm font-medium mb-1 ${todo.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
            {todo.title}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-2 text-caption text-[var(--text-muted)]">
            {todo.dueDate && (
              <span className={isOverdue ? 'text-[var(--accent-red)]' : ''}>
                {formatDate(todo.dueDate)}
              </span>
            )}
            {todo.issueNumber && (
              <span className="text-[var(--accent-green)]">
                #{todo.issueNumber}
              </span>
            )}
            {todo.labels.length > 0 && (
              <span>{todo.labels[0]}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return '今日';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return '明日';
  } else {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}

export default TodosTab;
