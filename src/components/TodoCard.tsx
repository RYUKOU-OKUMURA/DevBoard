/**
 * TodoCard component - Compact card for Kanban board
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '../types';
import { focusRing } from '../lib/focusRing';

interface TodoCardProps {
  todo: Todo;
  onClick: () => void;
  repoName?: string;
  isDragging?: boolean;
}

export const TodoCard: React.FC<TodoCardProps> = ({
  todo,
  onClick,
  repoName,
  isDragging = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: todo.id });

  const isDraggingState = isSortableDragging || isDragging;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDraggingState ? 0.5 : 1,
  };

  // Priority colors
  const priorityColors = {
    high: '#EF4444',
    medium: '#F97316',
    low: '#3B82F6',
  };

  const priorityLabels = {
    high: 'H',
    medium: 'M',
    low: 'L',
  };

  // Check if overdue
  const isOverdue =
    todo.status !== 'done' &&
    todo.dueDate &&
    new Date(todo.dueDate) < new Date();

  const isDueToday =
    todo.status !== 'done' &&
    todo.dueDate &&
    isToday(new Date(todo.dueDate));

  // Format due date
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (isToday(date)) {
      return '今日';
    } else if (isSameDay(date, tomorrow)) {
      return '明日';
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        group
        bg-[var(--surface-primary)]
        border border-[var(--border-subtle)]
        rounded-lg
        p-inset-sm
        cursor-pointer
        hover:border-[var(--accent-green-border)]
        hover:shadow-md
        transition-all duration-200
        ${isDraggingState ? 'shadow-lg ring-2 ring-[var(--accent-green)] ring-opacity-50' : ''}
      `}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        className="flex items-center justify-between mb-stack-xs cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-inline-xs">
          {/* Drag icon */}
          <span className="text-[var(--text-tertiary)] text-body-sm">⋮⋮</span>

          {/* Priority badge */}
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded text-caption font-medium border"
            style={{
              color: priorityColors[todo.priority],
              borderColor: priorityColors[todo.priority],
            }}
          >
            {priorityLabels[todo.priority]}
          </span>
        </div>

        {/* Due date */}
        {todo.dueDate && (
          <span
            className={`
              text-caption px-2 py-0.5 rounded
              ${
                isOverdue
                  ? 'text-[#EF4444] bg-[#EF4444]/10'
                  : isDueToday
                  ? 'text-[#F97316] bg-[#F97316]/10'
                  : 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]'
              }
            `}
          >
            {formatDueDate(todo.dueDate)}
          </span>
        )}
      </div>

      {/* Title - clickable */}
      <button
        onClick={onClick}
        className={`
          w-full text-left text-body-sm font-medium mb-stack-xs
          text-[var(--text-primary)]
          hover:text-[var(--accent-green)]
          transition-colors
          line-clamp-2
          ${focusRing.default}
        `}
      >
        {todo.title}
      </button>

      {/* Repository name */}
      {repoName && (
        <div className="text-caption text-[var(--text-tertiary)] mb-stack-xs truncate">
          {repoName}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-inline-xs flex-wrap">
        {/* Issue link */}
        {todo.issueNumber && (
          <span className="text-caption text-[var(--accent-green)]">
            🔗 #{todo.issueNumber}
          </span>
        )}

        {/* Labels (max 2) */}
        {todo.labels.slice(0, 2).map((label) => (
          <span
            key={label}
            className="text-caption px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)] truncate max-w-[80px]"
          >
            {label}
          </span>
        ))}
        {todo.labels.length > 2 && (
          <span className="text-caption text-[var(--text-tertiary)]">
            +{todo.labels.length - 2}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}
