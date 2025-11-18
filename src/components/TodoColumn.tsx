/**
 * TodoColumn component - Column in the Kanban board
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import type { Todo, TodoStatus } from '../types';
import { TodoCard } from './TodoCard';
import { focusRing } from '../lib/focusRing';

interface TodoColumnProps {
  status: TodoStatus;
  todos: Todo[];
  repoMap?: Map<string, string>;
  onTodoClick: (todo: Todo) => void;
  onAddTodo?: () => void;
}

const statusConfig = {
  todo: {
    title: '未着手',
    icon: '⏸️',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.05)',
  },
  in_progress: {
    title: '進行中',
    icon: '⚡',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.05)',
  },
  done: {
    title: '完了',
    icon: '✅',
    color: 'var(--accent-green)',
    bgColor: 'rgba(34, 197, 94, 0.05)',
  },
};

export const TodoColumn: React.FC<TodoColumnProps> = ({
  status,
  todos,
  repoMap = new Map(),
  onTodoClick,
  onAddTodo,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = statusConfig[status];
  const todoIds = todos.map((t) => t.id);

  return (
    <div className="flex flex-col h-full">
      {/* Column header */}
      <div
        className="flex items-center justify-between mb-stack-md pb-stack-sm border-b-2"
        style={{ borderColor: config.color }}
      >
        <div className="flex items-center gap-inline-sm">
          <span className="text-title-2">{config.icon}</span>
          <h3 className="text-body font-semibold" style={{ color: config.color }}>
            {config.title}
          </h3>
          <span
            className="text-caption px-2 py-1 rounded"
            style={{
              color: config.color,
              backgroundColor: config.bgColor,
            }}
          >
            {todos.length}
          </span>
        </div>

        {/* Add button */}
        {status === 'todo' && onAddTodo && (
          <button
            onClick={onAddTodo}
            className={`
              w-6 h-6 flex items-center justify-center
              rounded-full
              bg-[var(--surface-secondary)]
              text-[var(--text-secondary)]
              hover:bg-[var(--accent-green)] hover:text-white
              transition-colors
              ${focusRing.default}
            `}
            aria-label="ToDoを追加"
          >
            +
          </button>
        )}
      </div>

      {/* Column content */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 min-h-[200px] overflow-y-auto
          p-inset-xs rounded-lg
          transition-colors duration-200
          ${isOver ? 'ring-2 ring-[var(--accent-green)] ring-opacity-50' : ''}
        `}
        style={{ backgroundColor: config.bgColor }}
      >
        <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-stack-sm">
            {todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-stack-xl text-center">
                <span className="text-display-sm mb-stack-xs opacity-30">
                  {config.icon}
                </span>
                <p className="text-caption text-[var(--text-tertiary)]">
                  {status === 'todo' && 'タスクをここにドラッグ'}
                  {status === 'in_progress' && '進行中のタスクはありません'}
                  {status === 'done' && '完了したタスクはありません'}
                </p>
              </div>
            ) : (
              todos.map((todo) => (
                <motion.div
                  key={todo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TodoCard
                    todo={todo}
                    onClick={() => onTodoClick(todo)}
                    repoName={repoMap.get(todo.repoId)}
                  />
                </motion.div>
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
};
