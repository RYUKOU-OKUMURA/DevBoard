import React, { useState, useMemo, useEffect } from 'react';
import { Repo, ColumnKey, SortOrder, AppConfig, SavedView, ViewPreset } from '../types';
import { classifyRepo, DEFAULT_CONFIG } from '../utils/classify';
import { searchAndSortRepos } from '../utils/search';
import { getSavedViews, saveView, deleteView, getViewById } from '../utils/storage';
import { getPresets, savePreset, deletePreset, getPresetById, createPresetSnapshot } from '../utils/presetStorage';
import { RepoColumn } from './RepoColumn';
import { TopBar } from './TopBar';
import { CategoryManager } from './CategoryManager';

interface RepoBoardProps {
  repos: Repo[];
  config?: AppConfig;
  isLoading?: boolean;
  onRefresh?: () => void;
  onStatsUpdate?: (totalVisible: number, categoryCounts: Record<ColumnKey, number>) => void;
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
const COLUMN_ASSIGNMENTS_STORAGE_KEY = 'github-dashboard-column-assignments';
const HIDDEN_REPOS_STORAGE_KEY = 'github-dashboard-hidden-repos';

export const RepoBoard: React.FC<RepoBoardProps> = ({
  repos,
  config = DEFAULT_CONFIG,
  isLoading = false,
  onRefresh,
  onStatsUpdate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('lastUpdated');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Preset management
  const [presets, setPresets] = useState<ViewPreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string>('');

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>({
    Active: true,
    Stale: true,
    Dormant: true,
    Archived: true,
  });

  // Dynamic thresholds
  const [thresholds, setThresholds] = useState({
    activeThreshold: DEFAULT_CONFIG.activeThreshold,
    staleThreshold: DEFAULT_CONFIG.staleThreshold,
  });

  // NOTE: Category profile feature is under development.
  // Currently not used in classification logic, reserved for future implementation.
  const [currentProfileId, setCurrentProfileId] = useState('default');
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
  const [columnAssignments, setColumnAssignments] = useState<Record<string, ColumnKey>>(() => {
    try {
      const raw = localStorage.getItem(COLUMN_ASSIGNMENTS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as Record<string, ColumnKey>;
      }
    } catch {}
    return {};
  });
  const [orderMap, setOrderMap] = useState<Record<ColumnKey, string[]>>({
    Active: [],
    Stale: [],
    Dormant: [],
    Archived: [],
  });
  const [hiddenRepoIds, setHiddenRepoIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_REPOS_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        return new Set(arr);
      }
    } catch {}
    return new Set();
  });

  // Load saved views and presets on mount
  useEffect(() => {
    setSavedViews(getSavedViews());
    setPresets(getPresets());
    // Load order map
    try {
      const raw = localStorage.getItem(ORDER_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<ColumnKey, string[]>;
        setOrderMap((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  const filteredRepos = useMemo(() => {
    const searchResults = searchAndSortRepos(repos, searchQuery, sortOrder);
    // Filter out hidden repos
    return searchResults.filter((repo) => !hiddenRepoIds.has(repo.id));
  }, [repos, searchQuery, sortOrder, hiddenRepoIds]);

  const repoMap = useMemo(() => new Map(repos.map((repo) => [repo.id, repo] as const)), [repos]);

  // Apply search and sort, then classify into columns with manual overrides
  const classifiedRepos = useMemo(() => {
    const columns: Record<ColumnKey, Repo[]> = {
      Active: [],
      Stale: [],
      Dormant: [],
      Archived: [],
    };

    // Use dynamic thresholds for classification
    const dynamicConfig = {
      ...config,
      activeThreshold: thresholds.activeThreshold,
      staleThreshold: thresholds.staleThreshold,
    };

    filteredRepos.forEach((repo) => {
      const override = columnAssignments[repo.id];
      const column = override ?? classifyRepo(repo, dynamicConfig);
      columns[column].push(repo);
    });

    return columns;
  }, [filteredRepos, columnAssignments, config, thresholds]);

  // Notify parent of stats updates
  useEffect(() => {
    if (onStatsUpdate) {
      const totalVisible = Object.values(classifiedRepos).reduce((sum, repos) => sum + repos.length, 0);
      const categoryCounts: Record<ColumnKey, number> = {
        Active: classifiedRepos.Active.length,
        Stale: classifiedRepos.Stale.length,
        Dormant: classifiedRepos.Dormant.length,
        Archived: classifiedRepos.Archived.length,
      };
      onStatsUpdate(totalVisible, categoryCounts);
    }
  }, [classifiedRepos, onStatsUpdate]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_TITLES_STORAGE_KEY, JSON.stringify(columnTitles));
    } catch {}
  }, [columnTitles]);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_ASSIGNMENTS_STORAGE_KEY, JSON.stringify(columnAssignments));
    } catch {}
  }, [columnAssignments]);

  // Persist hidden repos
  useEffect(() => {
    try {
      localStorage.setItem(HIDDEN_REPOS_STORAGE_KEY, JSON.stringify(Array.from(hiddenRepoIds)));
    } catch {}
  }, [hiddenRepoIds]);

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

  const handleReorderWithinColumn = (col: ColumnKey, fromId: string, toId?: string) => {
    setOrderMap((prev) => {
      const list = [...(prev[col] || [])];
      const fromIdx = list.indexOf(fromId);
      if (fromIdx === -1) return prev;

      list.splice(fromIdx, 1);

      if (toId) {
        const toIdx = list.indexOf(toId);
        const insertIdx = toIdx === -1 ? list.length : toIdx;
        list.splice(insertIdx, 0, fromId);
      } else {
        list.push(fromId);
      }

      return { ...prev, [col]: list };
    });
  };

  const handleReorderBetween = (
    fromCol: ColumnKey,
    toCol: ColumnKey,
    fromId: string,
    toId?: string
  ) => {
    if (fromCol === toCol) {
      handleReorderWithinColumn(fromCol, fromId, toId);
      return;
    }

    const repo = repoMap.get(fromId);
    if (!repo) {
      return;
    }

    setColumnAssignments((prev) => {
      const next = { ...prev };
      const defaultColumn = classifyRepo(repo, config);
      if (toCol === defaultColumn) {
        delete next[fromId];
      } else {
        next[fromId] = toCol;
      }
      return next;
    });

    setOrderMap((prev) => {
      const fromList = [...(prev[fromCol] || [])].filter((id) => id !== fromId);
      const toListRaw = prev[toCol] || [];
      const toList = toListRaw.filter((id) => id !== fromId);

      if (toId) {
        const targetIdx = toList.indexOf(toId);
        const insertIdx = targetIdx === -1 ? toList.length : targetIdx;
        toList.splice(insertIdx, 0, fromId);
      } else {
        toList.push(fromId);
      }

      return {
        ...prev,
        [fromCol]: fromList,
        [toCol]: toList,
      };
    });
  };

  const handleHideRepo = (repoId: string) => {
    setHiddenRepoIds((prev) => new Set([...prev, repoId]));
  };

  const handleUnhideRepo = (repoId: string) => {
    setHiddenRepoIds((prev) => {
      const next = new Set(prev);
      next.delete(repoId);
      return next;
    });
  };

  const handleUnhideAll = () => {
    setHiddenRepoIds(new Set());
  };

  // Preset handlers
  const handlePresetSelect = (presetId: string) => {
    if (presetId === '') {
      // Clear preset selection
      setCurrentPresetId('');
      return;
    }

    const preset = getPresetById(presetId);
    if (preset) {
      // Load all state from preset
      setSearchQuery(preset.searchQuery);
      setSortOrder(preset.sortOrder);
      setColumnTitles(preset.columnTitles);
      setOrderMap(preset.columnOrder);
      setColumnVisibility(preset.columnVisibility);
      setThresholds(preset.thresholds);
      setColumnAssignments(preset.columnAssignments);
      setHiddenRepoIds(new Set(preset.hiddenRepoIds));
      setCurrentPresetId(presetId);
    }
  };

  const handleSavePreset = (name: string) => {
    const presetSnapshot = createPresetSnapshot({
      name,
      searchQuery,
      sortOrder,
      columnTitles,
      columnOrder: orderMap,
      columnVisibility,
      thresholds,
      columnAssignments,
      hiddenRepoIds: Array.from(hiddenRepoIds),
    });

    const newPreset = savePreset(presetSnapshot);
    if (newPreset) {
      setPresets(getPresets());
      setCurrentPresetId(newPreset.id);
      return true;
    }
    return false;
  };

  const handleDeletePreset = (presetId: string) => {
    if (deletePreset(presetId)) {
      setPresets(getPresets());
      if (currentPresetId === presetId) {
        setCurrentPresetId('');
      }
      return true;
    }
    return false;
  };

  const handleToggleColumnVisibility = (columnKey: ColumnKey) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
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
        presets={presets}
        currentPresetId={currentPresetId}
        onPresetSelect={handlePresetSelect}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        columnTitles={columnTitles}
        columnVisibility={columnVisibility}
        thresholds={thresholds}
        hiddenRepos={Array.from(hiddenRepoIds).map((id) => repoMap.get(id)).filter((r): r is Repo => r !== undefined)}
        onUnhideRepo={handleUnhideRepo}
        onUnhideAll={handleUnhideAll}
        onCategorySettings={() => setShowCategoryManager(true)}
      />

      <CategoryManager
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        currentProfileId={currentProfileId}
        onProfileSelect={setCurrentProfileId}
      />

      {/* Board Columns */}
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {COLUMN_ORDER.map((columnKey) =>
          columnVisibility[columnKey] ? (
            <RepoColumn
              key={columnKey}
              title={columnTitles[columnKey]}
              repos={getOrderedRepos(columnKey)}
              columnKey={columnKey}
              onReorder={handleReorderWithinColumn}
              onReorderBetween={handleReorderBetween}
              onTitleChange={handleColumnTitleChange}
              onHide={handleHideRepo}
              isVisible={columnVisibility[columnKey]}
              onToggleVisibility={handleToggleColumnVisibility}
            />
          ) : null
        )}
      </div>
    </div>
  );
};
