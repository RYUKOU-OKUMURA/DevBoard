/**
 * TodosTab component - Main TODO view with filters, stats, and board
 */

import React, { useState, useMemo } from 'react';
import { useTodos } from '../hooks/useTodos';
import { TodoBoard } from './TodoBoard';
import { TodoFilters } from './TodoFilters';
import { TodoStats } from './TodoStats';
import { TodoDetail } from './TodoDetail';
import { IssueSyncSettings } from './IssueSyncSettings';
import { IssueImportDialog } from './IssueImportDialog';
import type { Repo, Todo } from '../types';
import { focusRing } from '../lib/focusRing';
import { fetchIssuesFromGitHub } from '../utils/issueSync';

interface TodosTabProps {
  repos: Repo[];
}

export const TodosTab: React.FC<TodosTabProps> = ({ repos }) => {
  const {
    todos,
    stats,
    syncConfig,
    filter,
    sort,
    isSyncing,
    setFilter,
    setSort,
    updateTodo,
    createTodo,
    deleteTodo,
    createIssueFromTodo,
    importIssues,
    updateSyncConfig,
  } = useTodos();

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const defaultRepo = repos[0];
  const existingIssueNumbers = useMemo(
    () =>
      new Set(
        todos
          .map((todo) => todo.issueNumber)
          .filter((issueNumber): issueNumber is number => typeof issueNumber === 'number')
      ),
    [todos]
  );

  // Create repository map for TodoBoard
  const repoMap = useMemo(() => {
    const map = new Map<string, string>();
    repos.forEach((repo) => {
      map.set(repo.id, repo.nameWithOwner);
    });
    return map;
  }, [repos]);

  // Get repository options for filters
  const repoOptions = useMemo(() => {
    return repos.map((repo) => ({
      id: repo.id,
      name: repo.nameWithOwner,
    }));
  }, [repos]);

  // Get all unique labels from todos
  const availableLabels = useMemo(() => {
    const labels = new Set<string>();
    todos.forEach((todo) => {
      todo.labels.forEach((label) => labels.add(label));
    });
    return Array.from(labels).sort();
  }, [todos]);

  const handleTodoClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setIsDetailOpen(true);
  };

  const handleAddTodo = () => {
    const newTodo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'> = {
      title: 'New TODO',
      description: '',
      repoId: repos[0]?.id || '',
      status: 'todo',
      priority: 'medium',
      labels: [],
      syncEnabled: false,
    };
    createTodo(newTodo);
  };

  const handleCreateIssue = async (todoId: string) => {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;

    const result = await createIssueFromTodo(todoId, todo.repoId);
    if (result) {
      console.log('Issue created:', result);
    }
  };

  return (
    <div className="flex-1 bg-surface-app px-inset-xl py-inset-lg space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-stack-md">
        <div>
          <h2 className="text-title-2 font-semibold text-[var(--text-primary)]">TODO Management</h2>
          <p className="text-body-sm text-[var(--text-muted)] mt-1">
            Manage your tasks and sync with GitHub Issues
          </p>
        </div>
        <div className="flex items-center gap-inline-sm">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-inline-xs bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)]">
            <button
              onClick={() => setViewMode('board')}
              className={`
                px-inset-md py-inset-xs rounded-md text-body-sm transition-all duration-200
                ${focusRing.default}
                ${
                  viewMode === 'board'
                    ? 'bg-[var(--brand-purple)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
              aria-label="Board view"
              aria-pressed={viewMode === 'board'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`
                px-inset-md py-inset-xs rounded-md text-body-sm transition-all duration-200
                ${focusRing.default}
                ${
                  viewMode === 'list'
                    ? 'bg-[var(--brand-purple)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }
              `}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => setShowImportDialog(true)}
            className={`
              px-inset-lg py-inset-sm
              bg-[var(--bg-secondary)]
              border border-[var(--border-subtle)]
              rounded-lg
              text-body-sm text-[var(--text-primary)]
              transition-all duration-200
              hover:border-[var(--accent-green-border)]
              hover:bg-[var(--bg-tertiary)]
              ${focusRing.default}
            `}
          >
            Import Issues
          </button>
          <button
            onClick={() => setShowSyncSettings(true)}
            className={`
              px-inset-lg py-inset-sm
              bg-[var(--bg-secondary)]
              border border-[var(--border-subtle)]
              rounded-lg
              text-body-sm text-[var(--text-primary)]
              transition-all duration-200
              hover:border-[var(--accent-green-border)]
              hover:bg-[var(--bg-tertiary)]
              ${focusRing.default}
            `}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Sync Settings
          </button>
          <button
            onClick={handleAddTodo}
            className={`
              px-inset-lg py-inset-sm
              bg-[var(--brand-purple)]
              text-white
              rounded-lg
              text-body-sm font-semibold
              transition-all duration-200
              hover:bg-[var(--brand-purple-emphasis)]
              shadow-sm
              ${focusRing.default}
            `}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New TODO
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && <TodoStats stats={stats} />}

      {/* Filters */}
      <TodoFilters
        filter={filter}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
        repositories={repoOptions}
        availableLabels={availableLabels}
      />

      {/* Board / List View */}
      {viewMode === 'board' ? (
        <TodoBoard
          todos={todos}
          repoMap={repoMap}
          onUpdate={updateTodo}
          onTodoClick={handleTodoClick}
          onAddTodo={handleAddTodo}
          onCreateIssue={handleCreateIssue}
        />
      ) : (
        <div className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-inset-lg">
          <p className="text-body text-[var(--text-muted)] text-center">List view coming soon...</p>
        </div>
      )}

      {/* Sync Settings Modal */}
      {showSyncSettings && (
        <IssueSyncSettings
          isOpen={showSyncSettings}
          onClose={() => setShowSyncSettings(false)}
          config={
            syncConfig ?? {
              enabled: false,
              autoImport: false,
              autoClose: false,
              syncInterval: 15,
            }
          }
          onUpdate={updateSyncConfig}
          isSyncing={isSyncing}
          lastSyncAt={syncConfig?.lastSyncAt}
        />
      )}

      {/* Import Dialog */}
      {showImportDialog && defaultRepo && (
        <IssueImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          repoNameWithOwner={defaultRepo.nameWithOwner}
          onImport={async (issueNumbers) => {
            await importIssues(defaultRepo.nameWithOwner, issueNumbers);
            setShowImportDialog(false);
          }}
          fetchIssues={async (repoNameWithOwner) =>
            (await fetchIssuesFromGitHub(repoNameWithOwner)).issues
          }
          existingIssueNumbers={existingIssueNumbers}
        />
      )}

      {/* Todo Detail Modal */}
      {selectedTodo && (
        <TodoDetail
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTodo(null);
          }}
          todo={selectedTodo}
          onSave={(todoId, updates) => updateTodo(todoId, updates)}
          onDelete={(todoId) => {
            deleteTodo(todoId);
            setIsDetailOpen(false);
            setSelectedTodo(null);
          }}
          onCreateIssue={handleCreateIssue}
          repoName={repoMap.get(selectedTodo.repoId) || 'Unknown'}
        />
      )}
    </div>
  );
};
