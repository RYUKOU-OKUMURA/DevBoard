/**
 * TodoItem component - Display a single todo item with actions
 */

import { motion } from 'framer-motion';
import React, { useState } from 'react';
import type { Todo } from '../types';
import { focusRing } from '../lib/focusRing';
import { AIInstructionDialog } from './AIInstructionDialog';
import { AIStatusBadge } from './AIStatusBadge';
import { useGitHubActions } from '../hooks/useGitHubActions';
import type { GitHubBot } from '../types/githubActions';

interface TodoItemProps {
  todo: Todo;
  onUpdate: (updates: Partial<Todo>) => void;
  onDelete: () => void;
  onClick: () => void;
  showRepo?: boolean; // Show repository name (for global view)
  repoName?: string; // Repository name to display
}

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  onUpdate,
  onDelete,
  onClick,
  showRepo = false,
  repoName,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);

  // GitHub Actions AI integration (only if issue is linked)
  const {
    workflowStatus,
    isLoading: isAILoading,
    error: aiError,
    triggerBot,
    clearError,
  } = useGitHubActions({
    todoId: todo.id,
    repoId: todo.repoId,
    issueNumber: todo.issueNumber,
    autoLoadHistory: true,
  });

  // Priority colors
  const priorityColors = {
    high: 'text-[#EF4444] border-[#EF4444]',
    medium: 'text-[#F97316] border-[#F97316]',
    low: 'text-[#3B82F6] border-[#3B82F6]',
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

  // Toggle status
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newStatus = e.target.checked ? 'done' : 'todo';
    onUpdate({ status: newStatus });
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('このToDoを削除しますか？')) {
      onDelete();
    }
  };

  const handleAIClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAIDialogOpen(true);
  };

  const handleAISubmit = async (bot: GitHubBot, instruction?: string) => {
    await triggerBot(bot, instruction);
    setIsAIDialogOpen(false);
  };

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`
        group relative
        border rounded-lg p-inset-md
        bg-[var(--surface-primary)] border-[var(--border-subtle)]
        hover:border-[var(--accent-green-border)]
        transition-all duration-200
        ${todo.status === 'done' ? 'opacity-60' : ''}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-inline-sm">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-1" onClick={handleCheckboxClick}>
          <input
            type="checkbox"
            checked={todo.status === 'done'}
            onChange={handleCheckboxChange}
            className={`
              w-5 h-5 rounded border-2
              border-[var(--border-subtle)]
              text-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-50
              cursor-pointer
              transition-colors
            `}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-inline-xs mb-stack-xs">
            {/* Priority badge */}
            <span
              className={`
                inline-flex items-center justify-center
                w-6 h-6 rounded text-caption font-medium
                border ${priorityColors[todo.priority]}
              `}
            >
              {priorityLabels[todo.priority]}
            </span>

            {/* Title */}
            <button
              onClick={handleEditClick}
              className={`
                text-body font-medium text-left flex-1
                ${todo.status === 'done' ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}
                hover:text-[var(--accent-green)]
                transition-colors
                ${focusRing()}
              `}
            >
              {todo.title}
            </button>

            {/* Due date */}
            {todo.dueDate && (
              <span
                className={`
                  text-caption px-2 py-1 rounded
                  ${
                    isOverdue
                      ? 'text-[#EF4444] bg-[#EF4444]/10'
                      : isDueToday
                      ? 'text-[#F97316] bg-[#F97316]/10'
                      : 'text-[var(--text-secondary)] bg-[var(--surface-secondary)]'
                  }
                `}
              >
                📅 {formatDueDate(todo.dueDate)}
              </span>
            )}
          </div>

          {/* Repository name (for global view) */}
          {showRepo && repoName && (
            <div className="text-caption text-[var(--text-tertiary)] mb-stack-xs">
              {repoName}
            </div>
          )}

          {/* Description */}
          {todo.description && (
            <p className="text-body-sm text-[var(--text-secondary)] mb-stack-xs line-clamp-2">
              {todo.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-inline-sm flex-wrap">
            {/* Issue link */}
            {todo.issueNumber && (
              <a
                href={todo.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`
                  text-caption text-[var(--accent-green)]
                  hover:text-[var(--accent-green-hover)]
                  transition-colors
                  ${focusRing()}
                `}
              >
                🔗 #{todo.issueNumber}
              </a>
            )}

            {/* Labels */}
            {todo.labels.length > 0 && (
              <div className="flex gap-inline-xs">
                {todo.labels.slice(0, 3).map((label) => (
                  <span
                    key={label}
                    className="text-caption px-2 py-1 rounded bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                  >
                    {label}
                  </span>
                ))}
                {todo.labels.length > 3 && (
                  <span className="text-caption text-[var(--text-tertiary)]">
                    +{todo.labels.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Assignee */}
            {todo.assignee && (
              <span className="text-caption text-[var(--text-secondary)]">
                👤 {todo.assignee}
              </span>
            )}
          </div>

          {/* AI Integration (only if issue is linked) */}
          {todo.issueNumber && (
            <div className="flex items-center gap-inline-sm mt-stack-sm pt-stack-sm border-t border-[var(--border-subtle)]">
              <button
                onClick={handleAIClick}
                disabled={isAILoading}
                className={`
                  px-inset-sm py-inset-xs rounded-md text-caption
                  bg-brand-purple/10 text-brand-purple
                  hover:bg-brand-purple/20 transition
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                  focus-visible:ring-brand-purple focus-visible:ring-offset-[var(--bg-secondary)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                aria-label="AIで実装"
              >
                🤖 AIで実装
              </button>

              <AIStatusBadge status={workflowStatus || undefined} isLoading={isAILoading} />

              {aiError && (
                <span className="text-caption text-[#EF4444]" role="alert">
                  {aiError}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions (shown on hover) */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0 flex gap-inline-xs"
          >
            <button
              onClick={handleEditClick}
              className={`
                px-3 py-1 rounded text-caption
                bg-[var(--surface-secondary)]
                text-[var(--text-secondary)]
                hover:bg-[var(--accent-green)] hover:text-white
                transition-colors
                ${focusRing()}
              `}
            >
              編集
            </button>
            <button
              onClick={handleDeleteClick}
              className={`
                px-3 py-1 rounded text-caption
                bg-[var(--surface-secondary)]
                text-[var(--text-secondary)]
                hover:bg-[#EF4444] hover:text-white
                transition-colors
                ${focusRing()}
              `}
            >
              削除
            </button>
          </motion.div>
        )}
      </div>

      {/* AI Instruction Dialog */}
      {todo.issueNumber && (
        <AIInstructionDialog
          isOpen={isAIDialogOpen}
          onClose={() => {
            setIsAIDialogOpen(false);
            clearError();
          }}
          onSubmit={handleAISubmit}
          isLoading={isAILoading}
        />
      )}
    </motion.div>
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
