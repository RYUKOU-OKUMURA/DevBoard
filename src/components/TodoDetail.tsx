/**
 * TodoDetail component - Modal for viewing and editing todo details
 */

import React, { useState, useEffect } from 'react';
import type { Todo, TodoStatus, TodoPriority } from '../types';
import { GlassModal } from './ui/GlassModal';
import { focusRing } from '../lib/focusRing';

interface TodoDetailProps {
  isOpen: boolean;
  onClose: () => void;
  todo: Todo | null;
  onSave: (todoId: string, updates: Partial<Todo>) => void;
  onDelete?: (todoId: string) => void | Promise<void>;
  onCreateIssue?: (todoId: string) => void;
  repoName?: string;
}

export const TodoDetail: React.FC<TodoDetailProps> = ({
  isOpen,
  onClose,
  todo,
  onSave,
  onDelete,
  onCreateIssue,
  repoName,
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TodoStatus>('todo');
  const [priority, setPriority] = useState<TodoPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Initialize form with todo data
  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description || '');
      setStatus(todo.status);
      setPriority(todo.priority);
      setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
      setAssignee(todo.assignee || '');
      setLabels(todo.labels);
    }
  }, [todo]);

  // Handle save
  const handleSave = () => {
    if (!todo || !title.trim()) return;

    onSave(todo.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate || undefined,
      assignee: assignee.trim() || undefined,
      labels,
    });

    onClose();
  };

  // Handle delete
  const handleDelete = async () => {
    if (!todo || !onDelete || isDeleting) return;
    const confirmed = window.confirm('このTODOを削除してもよろしいですか？');
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      await onDelete(todo.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle label add
  const handleAddLabel = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && labelInput.trim()) {
      e.preventDefault();
      if (!labels.includes(labelInput.trim())) {
        setLabels([...labels, labelInput.trim()]);
      }
      setLabelInput('');
    }
  };

  // Handle label remove
  const handleRemoveLabel = (label: string) => {
    setLabels(labels.filter((l) => l !== label));
  };

  // Handle create issue
  const handleCreateIssue = () => {
    if (!todo || !onCreateIssue) return;
    onCreateIssue(todo.id);
  };

  if (!todo) return null;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="ToDo詳細"
      className="max-w-2xl"
      tone="light"
    >
      <div className="space-y-stack-lg">
        {/* Title */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            タイトル<span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`
              w-full px-inset-md py-inset-sm
              border border-[var(--border-subtle)]
              rounded-lg
              bg-[var(--surface-primary)]
              text-[var(--text-primary)]
              focus:border-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
              transition-colors
            `}
            placeholder="ToDoのタイトルを入力"
          />
        </div>

        {/* Repository (read-only) */}
        {repoName && (
          <div>
            <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
              リポジトリ
            </label>
            <div className="px-inset-md py-inset-sm bg-[var(--surface-secondary)] rounded-lg text-[var(--text-secondary)]">
              {repoName}
            </div>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            ステータス
          </label>
          <div className="flex gap-inline-md">
            {(['todo', 'in_progress', 'done'] as TodoStatus[]).map((s) => (
              <label
                key={s}
                className={`
                  flex-1 flex items-center justify-center
                  px-inset-md py-inset-sm
                  border-2 rounded-lg
                  cursor-pointer
                  transition-all
                  ${
                    status === s
                      ? 'border-[var(--accent-green)] bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-green-border)]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={(e) => setStatus(e.target.value as TodoStatus)}
                  className="sr-only"
                />
                <span className="text-body-sm font-medium">
                  {s === 'todo' ? '未着手' : s === 'in_progress' ? '進行中' : '完了'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            優先度
          </label>
          <div className="flex gap-inline-md">
            {(['high', 'medium', 'low'] as TodoPriority[]).map((p) => (
              <label
                key={p}
                className={`
                  flex-1 flex items-center justify-center
                  px-inset-md py-inset-sm
                  border-2 rounded-lg
                  cursor-pointer
                  transition-all
                  ${
                    priority === p
                      ? p === 'high'
                        ? 'border-[#EF4444] bg-[#EF4444]/10 text-[#EF4444]'
                        : p === 'medium'
                        ? 'border-[#F97316] bg-[#F97316]/10 text-[#F97316]'
                        : 'border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--accent-green-border)]'
                  }
                `}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={(e) => setPriority(e.target.value as TodoPriority)}
                  className="sr-only"
                />
                <span className="text-body-sm font-medium">
                  {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            期日
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`
              w-full px-inset-md py-inset-sm
              border border-[var(--border-subtle)]
              rounded-lg
              bg-[var(--surface-primary)]
              text-[var(--text-primary)]
              focus:border-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
              transition-colors
            `}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={`
              w-full px-inset-md py-inset-sm
              border border-[var(--border-subtle)]
              rounded-lg
              bg-[var(--surface-primary)]
              text-[var(--text-primary)]
              focus:border-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
              transition-colors
              resize-vertical
            `}
            placeholder="詳細な説明をMarkdown形式で記入..."
          />
          <p className="mt-stack-xs text-caption text-[var(--text-tertiary)]">
            Markdown形式で記述できます
          </p>
        </div>

        {/* Labels */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            ラベル
          </label>
          <div className="flex flex-wrap gap-inline-xs mb-stack-sm">
            {labels.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-inline-xs px-3 py-1 bg-[var(--surface-secondary)] text-[var(--text-secondary)] rounded-full text-caption"
              >
                {label}
                <button
                  onClick={() => handleRemoveLabel(label)}
                  className="hover:text-[#EF4444] transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={handleAddLabel}
            className={`
              w-full px-inset-md py-inset-sm
              border border-[var(--border-subtle)]
              rounded-lg
              bg-[var(--surface-primary)]
              text-[var(--text-primary)]
              focus:border-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
              transition-colors
            `}
            placeholder="ラベルを入力してEnter"
          />
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-xs">
            担当者
          </label>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className={`
              w-full px-inset-md py-inset-sm
              border border-[var(--border-subtle)]
              rounded-lg
              bg-[var(--surface-primary)]
              text-[var(--text-primary)]
              focus:border-[var(--accent-green)]
              focus:ring-2 focus:ring-[var(--accent-green)] focus:ring-opacity-20
              transition-colors
            `}
            placeholder="GitHubユーザー名"
          />
        </div>

        {/* Issue sync */}
        <div className="border-t border-[var(--border-subtle)] pt-stack-lg">
          <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-stack-sm">
            Issue連携
          </label>
          {todo.issueNumber ? (
            <div className="flex items-center justify-between p-inset-md bg-[var(--surface-secondary)] rounded-lg">
              <div className="flex items-center gap-inline-sm">
                <span className="text-body">🔗 Issue #{todo.issueNumber}</span>
                {todo.syncEnabled && (
                  <span className="text-caption text-[var(--accent-green)] bg-[var(--accent-green)]/10 px-2 py-1 rounded">
                    同期有効
                  </span>
                )}
              </div>
              <a
                href={todo.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`
                  px-3 py-1 rounded
                  bg-[var(--accent-green)]
                  text-white text-caption
                  hover:bg-[var(--accent-green-hover)]
                  transition-colors
                  ${focusRing.default}
                `}
              >
                Issueを開く
              </a>
            </div>
          ) : (
            <button
              onClick={handleCreateIssue}
              disabled={!onCreateIssue}
              className={`
                w-full px-inset-md py-inset-sm
                border-2 border-dashed border-[var(--border-subtle)]
                rounded-lg
                text-[var(--text-secondary)]
                hover:border-[var(--accent-green)] hover:text-[var(--accent-green)]
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${focusRing.default}
              `}
            >
              新しいIssueを作成
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-inline-md pt-stack-md border-t border-[var(--border-subtle)]">
          <button
            onClick={onClose}
            className={`
              flex-1 px-inset-lg py-inset-md
              border border-[var(--border-subtle)]
              rounded-lg
              text-[var(--text-secondary)]
              hover:bg-[var(--surface-secondary)]
              transition-colors
              ${focusRing.default}
            `}
          >
            キャンセル
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`
                flex-1 px-inset-lg py-inset-md
                rounded-lg
                border border-[#EF4444]
                text-[#EF4444]
                hover:bg-[#EF4444]/10
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${focusRing.default}
              `}
            >
              {isDeleting ? '削除中…' : '削除'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className={`
              flex-1 px-inset-lg py-inset-md
              rounded-lg
              bg-[var(--accent-green)]
              text-white font-medium
              hover:bg-[var(--accent-green-hover)]
              transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${focusRing.default}
            `}
          >
            保存
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
