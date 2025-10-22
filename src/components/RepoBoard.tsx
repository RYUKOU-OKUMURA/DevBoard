import React, { useState, useMemo, useEffect } from 'react';
import { Repo, ColumnKey, SortOrder, AppConfig, SavedView } from '../types';
import { classifyRepos, DEFAULT_CONFIG } from '../utils/classify';
import { searchAndSortRepos } from '../utils/search';
import { getSavedViews, saveView, deleteView, getViewById } from '../utils/storage';
import { RepoColumn } from './RepoColumn';
import { TopBar } from './TopBar';

interface RepoBoardProps {
  repos: Repo[];
  config?: AppConfig;
  isLoading?: boolean;
  onRefresh?: () => void;
}

const COLUMN_TITLES: Record<ColumnKey, string> = {
  Active: 'Active',
  Stale: 'Stale',
  Dormant: 'Dormant',
  Archived: 'Archived',
};

const COLUMN_ORDER: ColumnKey[] = ['Active', 'Stale', 'Dormant', 'Archived'];

export const RepoBoard: React.FC<RepoBoardProps> = ({
  repos,
  config = DEFAULT_CONFIG,
  isLoading = false,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('lastUpdated');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string>('');

  // Load saved views on mount
  useEffect(() => {
    setSavedViews(getSavedViews());
  }, []);

  // Apply search and sort, then classify into columns
  const classifiedRepos = useMemo(() => {
    const filtered = searchAndSortRepos(repos, searchQuery, sortOrder);
    return classifyRepos(filtered, config);
  }, [repos, searchQuery, sortOrder, config]);

  // Calculate total counts
  const totalRepos = repos.length;
  const filteredCount = Object.values(classifiedRepos).reduce(
    (sum, columnRepos) => sum + columnRepos.length,
    0
  );

  // Handle view selection
  const handleViewSelect = (viewId: string) => {
    if (viewId === '') {
      // Clear view selection
      setCurrentViewId('');
      return;
    }

    const view = getViewById(viewId);
    if (view) {
      setSearchQuery(view.searchQuery);
      setSortOrder(view.sortOrder);
      setCurrentViewId(viewId);
    }
  };

  // Handle save current view
  const handleSaveView = (name: string) => {
    const newView = saveView(name, searchQuery, sortOrder);
    if (newView) {
      setSavedViews(getSavedViews());
      setCurrentViewId(newView.id);
      return true;
    }
    return false;
  };

  // Handle delete view
  const handleDeleteView = (viewId: string) => {
    if (deleteView(viewId)) {
      setSavedViews(getSavedViews());
      if (currentViewId === viewId) {
        setCurrentViewId('');
      }
      return true;
    }
    return false;
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        totalRepos={totalRepos}
        filteredCount={filteredCount}
        isLoading={isLoading}
        onRefresh={onRefresh}
        savedViews={savedViews}
        currentViewId={currentViewId}
        onViewSelect={handleViewSelect}
        onSaveView={handleSaveView}
        onDeleteView={handleDeleteView}
      />

      {/* Board Columns */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {COLUMN_ORDER.map((columnKey) => (
          <RepoColumn
            key={columnKey}
            title={COLUMN_TITLES[columnKey]}
            repos={classifiedRepos[columnKey]}
            columnKey={columnKey}
          />
        ))}
      </div>
    </div>
  );
};
