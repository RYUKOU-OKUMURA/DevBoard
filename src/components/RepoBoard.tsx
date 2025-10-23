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
  Active: 'アクティブ',
  Stale: '停滞',
  Dormant: '休眠',
  Archived: 'アーカイブ',
};

const COLUMN_ORDER: ColumnKey[] = ['Active', 'Stale', 'Dormant', 'Archived'];

const ORDER_STORAGE_KEY = 'github-dashboard-column-order';
const DASHBOARD_TITLE = 'GitHubダッシュボード';
const COLUMN_TITLES_STORAGE_KEY = 'github-dashboard-column-titles';

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
  const [columnTitles, setColumnTitles] = useState<Record<ColumnKey, string>>(() => {
    try {
      const raw = localStorage.getItem(COLUMN_TITLES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, string>>;
        return { ...COLUMN_TITLES, ...parsed };
      }
    } catch {}
    return { ...COLUMN_TITLES };
  });
  const [orderMap, setOrderMap] = useState<Record<ColumnKey, string[]>>({
    Active: [],
    Stale: [],
    Dormant: [],
    Archived: [],
  });

  // Load saved views on mount
  useEffect(() => {
    setSavedViews(getSavedViews());
    // Load order map
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<ColumnKey, string[]>;
        setOrderMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  // Apply search and sort, then classify into columns
  const classifiedRepos = useMemo(() => {
    const filtered = searchAndSortRepos(repos, searchQuery, sortOrder);
    return classifyRepos(filtered, config);
  }, [repos, searchQuery, sortOrder, config]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_TITLES_STORAGE_KEY, JSON.stringify(columnTitles));
    } catch {}
  }, [columnTitles]);

  // Sync order map with current repos per column
  useEffect(() => {
    const next: Record<ColumnKey, string[]> = { Active: [], Stale: [], Dormant: [], Archived: [] };
    (Object.keys(classifiedRepos) as ColumnKey[]).forEach((col) => {
      const ids = classifiedRepos[col].map((r) => r.id);
      const existing = orderMap[col] || [];
      // keep existing order, append any new ids
      const ordered = [...existing.filter((id) => ids.includes(id)), ...ids.filter((id) => !existing.includes(id))];
      next[col] = ordered;
    });
    setOrderMap(next);
  }, [classifiedRepos]);

  // Persist order map
  useEffect(() => {
    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderMap));
    } catch {}
  }, [orderMap]);

  // Calculate total counts
  const totalRepos = repos.length;
  const filteredCount = Object.values(classifiedRepos).reduce(
    (sum, columnRepos) => sum + columnRepos.length,
    0
  );

  // Provide ordered repos per column
  const getOrderedRepos = (col: ColumnKey): Repo[] => {
    const idOrder = orderMap[col] || [];
    const map = new Map(classifiedRepos[col].map((r) => [r.id, r] as const));
    const ordered: Repo[] = [];
    idOrder.forEach((id) => {
      const r = map.get(id);
      if (r) ordered.push(r);
    });
    // append any leftover (shouldn’t happen normally)
    classifiedRepos[col].forEach((r) => {
      if (!idOrder.includes(r.id)) ordered.push(r);
    });
    return ordered;
  };

  const handleColumnTitleChange = (col: ColumnKey, newTitle: string) => {
    setColumnTitles((prev) => {
      const trimmed = newTitle.trim();
      if (!trimmed || prev[col] === trimmed) {
        return prev;
      }
      return { ...prev, [col]: trimmed };
    });
  };

  // Handlers for view selection
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

  const handleReorder = (col: ColumnKey, fromId: string, toId: string) => {
    setOrderMap((prev) => {
      const list = [...(prev[col] || [])];
      const fromIdx = list.indexOf(fromId);
      const toIdx = list.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      list.splice(fromIdx, 1);
      list.splice(toIdx, 0, fromId);
      return { ...prev, [col]: list };
    });
  };

  const handleReorderBetween = (
    fromCol: ColumnKey,
    toCol: ColumnKey,
    fromId: string,
    toId?: string
  ) => {
    // Optional: allow moving across columns visually. Since columns are derived from activity, this is limited to ordering only.
    // Here we only allow reordering within the same column for consistency with classification rules.
    if (fromCol === toCol && toId) {
      handleReorder(fromCol, fromId, toId);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <TopBar
        title={DASHBOARD_TITLE}
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
            title={columnTitles[columnKey]}
            repos={getOrderedRepos(columnKey)}
            columnKey={columnKey}
            onReorder={handleReorder}
            onReorderBetween={handleReorderBetween}
            onTitleChange={handleColumnTitleChange}
          />
        ))}
      </div>
    </div>
  );
};
