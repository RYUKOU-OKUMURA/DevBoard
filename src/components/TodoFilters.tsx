/**
 * TodoFilters component - Comprehensive filtering and search UI for todos
 */

import React, { useState } from 'react';
import type { TodoFilter, TodoSort, TodoStatus, TodoPriority } from '../types/todo';
import { focusRing } from '../lib/focusRing';
import { motion, AnimatePresence } from 'framer-motion';

interface TodoFiltersProps {
  filter: TodoFilter;
  sort: TodoSort;
  onFilterChange: (filter: TodoFilter) => void;
  onSortChange: (sort: TodoSort) => void;
  repositories?: Array<{ id: string; name: string }>;
  availableLabels?: string[];
}

export const TodoFilters: React.FC<TodoFiltersProps> = ({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  repositories = [],
  availableLabels = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status filter options
  const statusOptions: Array<{ value: TodoStatus; label: string }> = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  // Priority filter options
  const priorityOptions: Array<{ value: TodoPriority; label: string; color: string }> = [
    { value: 'high', label: 'High', color: 'text-[var(--brand-red)]' },
    { value: 'medium', label: 'Medium', color: 'text-[var(--accent-yellow)]' },
    { value: 'low', label: 'Low', color: 'text-[var(--accent-green)]' },
  ];

  // Sort options
  const sortOptions: Array<{ value: TodoSort; label: string }> = [
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'title', label: 'Title' },
  ];

  // Due date presets
  const dueDatePresets = [
    { label: 'Overdue', value: 'overdue' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'thisWeek' },
  ];

  // Handle status toggle
  const handleStatusToggle = (status: TodoStatus) => {
    const currentStatuses = filter.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onFilterChange({ ...filter, status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  // Handle priority toggle
  const handlePriorityToggle = (priority: TodoPriority) => {
    const currentPriorities = filter.priority || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority];
    onFilterChange({
      ...filter,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
    });
  };

  // Handle repository filter
  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filter,
      repoIds: value ? [value] : undefined,
    });
  };

  // Handle label toggle
  const handleLabelToggle = (label: string) => {
    const currentLabels = filter.labels || [];
    const newLabels = currentLabels.includes(label)
      ? currentLabels.filter((l) => l !== label)
      : [...currentLabels, label];
    onFilterChange({ ...filter, labels: newLabels.length > 0 ? newLabels : undefined });
  };

  // Handle search query
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filter, searchQuery: e.target.value || undefined });
  };

  // Handle due date preset
  const handleDueDatePreset = (preset: string) => {
    const now = new Date();
    let start: string | undefined;
    let end: string | undefined;

    switch (preset) {
      case 'overdue':
        end = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;
      case 'thisWeek': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        start = weekStart.toISOString();
        end = weekEnd.toISOString();
        break;
      }
    }

    onFilterChange({
      ...filter,
      dueDateRange: start || end ? { start, end } : undefined,
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    onFilterChange({});
  };

  // Count active filters
  const activeFilterCount = [
    filter.status?.length,
    filter.priority?.length,
    filter.repoIds?.length,
    filter.labels?.length,
    filter.dueDateRange ? 1 : 0,
    filter.searchQuery ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-stack-md">
      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-inline-md">
        {/* Search Input */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search todos..."
            value={filter.searchQuery || ''}
            onChange={handleSearchChange}
            className={`
              w-full px-inset-md py-inset-sm
              bg-[var(--bg-secondary)]
              border border-[var(--border-subtle)]
              rounded-lg
              text-body text-[var(--text-primary)]
              placeholder:text-[var(--text-muted)]
              transition-all duration-200
              hover:border-[var(--accent-green-border)]
              ${focusRing}
            `}
            aria-label="Search todos"
          />
        </div>

        {/* Sort Selector */}
        <div className="flex gap-inline-sm items-center">
          <label htmlFor="sort-select" className="text-body-sm text-[var(--text-muted)] whitespace-nowrap">
            Sort by:
          </label>
          <select
            id="sort-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as TodoSort)}
            className={`
              px-inset-md py-inset-sm
              bg-[var(--bg-secondary)]
              border border-[var(--border-subtle)]
              rounded-lg
              text-body text-[var(--text-primary)]
              transition-all duration-200
              hover:border-[var(--accent-green-border)]
              ${focusRing}
            `}
            aria-label="Sort order"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Expand/Collapse Filters Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`
            px-inset-lg py-inset-sm
            bg-[var(--bg-secondary)]
            border border-[var(--border-subtle)]
            rounded-lg
            text-body-sm text-[var(--text-primary)]
            transition-all duration-200
            hover:border-[var(--accent-green-border)]
            hover:bg-[var(--bg-tertiary)]
            ${focusRing}
            flex items-center gap-inline-xs
          `}
          aria-label={isExpanded ? 'Hide filters' : 'Show filters'}
          aria-expanded={isExpanded}
        >
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--brand-purple)] text-caption text-white">
              {activeFilterCount}
            </span>
          )}
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-inset-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg space-y-stack-md">
              {/* Status Filter */}
              <div>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
                  Status
                </label>
                <div className="flex flex-wrap gap-inline-sm">
                  {statusOptions.map((option) => {
                    const isSelected = filter.status?.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleStatusToggle(option.value)}
                        className={`
                          px-inset-md py-inset-xs
                          rounded-lg
                          text-body-sm
                          transition-all duration-200
                          ${focusRing}
                          ${
                            isSelected
                              ? 'bg-[var(--brand-purple)] text-white border-transparent'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-green-border)]'
                          }
                        `}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
                  Priority
                </label>
                <div className="flex flex-wrap gap-inline-sm">
                  {priorityOptions.map((option) => {
                    const isSelected = filter.priority?.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => handlePriorityToggle(option.value)}
                        className={`
                          px-inset-md py-inset-xs
                          rounded-lg
                          text-body-sm
                          transition-all duration-200
                          ${focusRing}
                          ${
                            isSelected
                              ? 'bg-[var(--brand-purple)] text-white border-transparent'
                              : `bg-[var(--bg-tertiary)] ${option.color} border border-[var(--border-subtle)] hover:border-[var(--accent-green-border)]`
                          }
                        `}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Repository Filter */}
              {repositories.length > 0 && (
                <div>
                  <label htmlFor="repo-filter" className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
                    Repository
                  </label>
                  <select
                    id="repo-filter"
                    value={filter.repoIds?.[0] || ''}
                    onChange={handleRepoChange}
                    className={`
                      w-full px-inset-md py-inset-sm
                      bg-[var(--bg-tertiary)]
                      border border-[var(--border-subtle)]
                      rounded-lg
                      text-body text-[var(--text-primary)]
                      transition-all duration-200
                      hover:border-[var(--accent-green-border)]
                      ${focusRing}
                    `}
                  >
                    <option value="">All Repositories</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Labels Filter */}
              {availableLabels.length > 0 && (
                <div>
                  <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
                    Labels
                  </label>
                  <div className="flex flex-wrap gap-inline-sm">
                    {availableLabels.map((label) => {
                      const isSelected = filter.labels?.includes(label);
                      return (
                        <button
                          key={label}
                          onClick={() => handleLabelToggle(label)}
                          className={`
                            px-inset-md py-inset-xs
                            rounded-lg
                            text-caption
                            transition-all duration-200
                            ${focusRing}
                            ${
                              isSelected
                                ? 'bg-[var(--brand-purple)] text-white border-transparent'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-green-border)]'
                            }
                          `}
                          aria-pressed={isSelected}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Due Date Presets */}
              <div>
                <label className="block text-body-sm font-medium text-[var(--text-primary)] mb-2">
                  Due Date
                </label>
                <div className="flex flex-wrap gap-inline-sm">
                  {dueDatePresets.map((preset) => {
                    const isActive =
                      (preset.value === 'overdue' && filter.dueDateRange?.end) ||
                      (preset.value === 'today' && filter.dueDateRange?.start && filter.dueDateRange?.end) ||
                      (preset.value === 'thisWeek' && filter.dueDateRange?.start && filter.dueDateRange?.end);

                    return (
                      <button
                        key={preset.value}
                        onClick={() => handleDueDatePreset(preset.value)}
                        className={`
                          px-inset-md py-inset-xs
                          rounded-lg
                          text-body-sm
                          transition-all duration-200
                          ${focusRing}
                          ${
                            isActive
                              ? 'bg-[var(--brand-purple)] text-white border-transparent'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--accent-green-border)]'
                          }
                        `}
                        aria-pressed={!!isActive}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clear Filters Button */}
              {activeFilterCount > 0 && (
                <div className="pt-stack-sm border-t border-[var(--border-subtle)]">
                  <button
                    onClick={handleClearFilters}
                    className={`
                      w-full px-inset-lg py-inset-sm
                      bg-[var(--bg-tertiary)]
                      border border-[var(--border-subtle)]
                      rounded-lg
                      text-body-sm text-[var(--text-muted)]
                      transition-all duration-200
                      hover:border-[var(--brand-red)]
                      hover:text-[var(--brand-red)]
                      hover:bg-[var(--brand-red-soft)]
                      ${focusRing}
                    `}
                    aria-label="Clear all filters"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
