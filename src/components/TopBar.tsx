import React, { useState, useEffect } from 'react';
import { SortOrder, SavedView } from '../types';
import { getSavedViews, saveView, deleteView } from '../storage';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOrder: SortOrder;
  onSortChange: (order: SortOrder) => void;
  totalRepos: number;
  filteredCount: number;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
  totalRepos,
  filteredCount,
  isLoading = false,
  onRefresh,
}) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState<string>('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [saveError, setSaveError] = useState('');

  // Load saved views on mount
  useEffect(() => {
    loadSavedViews();
  }, []);

  const loadSavedViews = () => {
    const views = getSavedViews();
    setSavedViews(views);
  };

  const handleSaveCurrentView = () => {
    setSaveError('');
    if (!newViewName.trim()) {
      setSaveError('Please enter a view name');
      return;
    }

    try {
      const newView = saveView(newViewName, searchQuery, sortOrder);
      if (newView) {
        loadSavedViews();
        setNewViewName('');
        setShowSaveDialog(false);
        setSelectedViewId(newView.id);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save view');
    }
  };

  const handleSelectView = (viewId: string) => {
    setSelectedViewId(viewId);
    if (viewId === '') {
      // Clear selection - don't change anything
      return;
    }

    const view = savedViews.find((v) => v.id === viewId);
    if (view) {
      onSearchChange(view.searchQuery);
      onSortChange(view.sortOrder);
    }
  };

  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this saved view?')) {
      deleteView(viewId);
      loadSavedViews();
      if (selectedViewId === viewId) {
        setSelectedViewId('');
      }
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            GitHub Dashboard
          </h1>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                '↻ Refresh'
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search repositories (name, language, topics, description...)"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="sm:w-48">
            <select
              value={sortOrder}
              onChange={(e) => onSortChange(e.target.value as SortOrder)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="lastUpdated">Sort: Last Updated</option>
              <option value="name">Sort: Name (A-Z)</option>
            </select>
          </div>

          {/* Saved Views Selector */}
          <div className="sm:w-64 flex gap-2">
            <select
              value={selectedViewId}
              onChange={(e) => handleSelectView(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Saved Views ({savedViews.length}/5)</option>
              {savedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={savedViews.length >= 5}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title="Save current view"
            >
              +
            </button>
            {selectedViewId && (
              <button
                onClick={(e) => handleDeleteView(selectedViewId, e)}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                title="Delete selected view"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredCount} of {totalRepos} repositories
          {searchQuery && (
            <span className="ml-2 text-blue-600">
              (filtered by "{searchQuery}")
            </span>
          )}
        </div>
      </div>

      {/* Save View Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Save Current View</h2>
            <p className="text-gray-600 mb-4">
              This will save your current search query and sort order.
            </p>
            <div className="mb-4">
              <label htmlFor="viewName" className="block text-sm font-medium text-gray-700 mb-2">
                View Name
              </label>
              <input
                id="viewName"
                type="text"
                value={newViewName}
                onChange={(e) => {
                  setNewViewName(e.target.value);
                  setSaveError('');
                }}
                placeholder="e.g., Active TypeScript Projects"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {saveError && (
                <p className="mt-2 text-sm text-red-600">{saveError}</p>
              )}
            </div>
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-gray-600">
                <strong>Search:</strong> {searchQuery || '(none)'}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Sort:</strong> {sortOrder === 'lastUpdated' ? 'Last Updated' : 'Name (A-Z)'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveCurrentView}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save View
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewViewName('');
                  setSaveError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
