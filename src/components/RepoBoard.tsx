import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Repo, ColumnKey, SortOrder, AppConfig, SavedView, ViewPreset } from '../types';
import { classifyRepo, DEFAULT_CONFIG } from '../utils/classify';
import { searchAndSortRepos } from '../utils/search';
import { getSavedViews, saveView, deleteView, getViewById } from '../utils/storage';
import { getPresets, savePreset, deletePreset, getPresetById, createPresetSnapshot } from '../utils/presetStorage';
import { RepoColumn } from './RepoColumn';
import { TopBar } from './TopBar';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorageState } from '../hooks/useLocalStorageState';

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
const COLUMN_TITLES_STORAGE_KEY = 'github-dashboard-column-titles';
const COLUMN_ASSIGNMENTS_STORAGE_KEY = 'github-dashboard-column-assignments';
const HIDDEN_REPOS_STORAGE_KEY_PREFIX = 'github-dashboard-hidden-repos';

/**
 * Get storage key for hidden repos based on account ID
 */
function getHiddenReposStorageKey(accountId?: string): string {
  if (accountId) {
    return `${HIDDEN_REPOS_STORAGE_KEY_PREFIX}:${accountId}`;
  }
  // Fallback to global key for backward compatibility
  return HIDDEN_REPOS_STORAGE_KEY_PREFIX;
}

const DEFAULT_ORDER_MAP: Record<ColumnKey, string[]> = {
  Active: [],
  Stale: [],
  Dormant: [],
  Archived: [],
};

const parseColumnTitles = (raw: string): Record<ColumnKey, string> => {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, string>>;
    return { ...COLUMN_TITLES, ...parsed };
  } catch {
    return { ...COLUMN_TITLES };
  }
};

const parseColumnAssignments = (raw: string): Record<string, ColumnKey> => {
  try {
    const parsed = JSON.parse(raw) as Record<string, ColumnKey>;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
};

const parseOrderMap = (raw: string): Record<ColumnKey, string[]> => {
  try {
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, string[]>>;
    return {
      Active: Array.isArray(parsed?.Active) ? parsed.Active : [],
      Stale: Array.isArray(parsed?.Stale) ? parsed.Stale : [],
      Dormant: Array.isArray(parsed?.Dormant) ? parsed.Dormant : [],
      Archived: Array.isArray(parsed?.Archived) ? parsed.Archived : [],
    };
  } catch {
    return { ...DEFAULT_ORDER_MAP };
  }
};

const parseHiddenRepoIds = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

const arraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

export const RepoBoard: React.FC<RepoBoardProps> = ({
  repos,
  config = DEFAULT_CONFIG,
  isLoading = false,
  onRefresh,
  onStatsUpdate,
}) => {
  const { user } = useAuth(); // Get current user for account-scoped presets
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('lastUpdated');
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string>('');

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

  const [columnTitles, setColumnTitles] = useLocalStorageState<Record<ColumnKey, string>>(
    COLUMN_TITLES_STORAGE_KEY,
    { ...COLUMN_TITLES },
    { deserialize: parseColumnTitles }
  );
  const [columnAssignments, setColumnAssignments] = useLocalStorageState<Record<string, ColumnKey>>(
    COLUMN_ASSIGNMENTS_STORAGE_KEY,
    {},
    { deserialize: parseColumnAssignments }
  );
  const [orderMap, setOrderMap] = useLocalStorageState<Record<ColumnKey, string[]>>(
    ORDER_STORAGE_KEY,
    { ...DEFAULT_ORDER_MAP },
    { deserialize: parseOrderMap }
  );
  const [hiddenRepoIds, setHiddenRepoIds] = useLocalStorageState<string[]>(
    getHiddenReposStorageKey(user?.userId),
    [],
    { deserialize: parseHiddenRepoIds }
  );

  // Load saved views and presets on mount and when user changes
  useEffect(() => {
    setSavedViews(getSavedViews());
    setPresets(getPresets(user?.userId));
  }, [user?.userId]);

  const hiddenRepoIdSet = useMemo(() => new Set(hiddenRepoIds), [hiddenRepoIds]);

  const repoMap = useMemo(() => new Map(repos.map((repo) => [repo.id, repo] as const)), [repos]);

  // Calculate which hidden repos actually exist in the current repo list
  const existingHiddenRepos = useMemo(() => {
    return hiddenRepoIds
      .map((id) => repoMap.get(id))
      .filter((r): r is Repo => r !== undefined);
  }, [hiddenRepoIds, repoMap]);

  const filteredRepos = useMemo(() => {
    const searchResults = searchAndSortRepos(repos, searchQuery, sortOrder);
    // Filter out hidden repos
    return searchResults.filter((repo) => !hiddenRepoIdSet.has(repo.id));
  }, [repos, searchQuery, sortOrder, hiddenRepoIdSet]);

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

  // Calculate stats from classified repos
  const stats = useMemo(() => {
    const totalVisible = Object.values(classifiedRepos).reduce((sum, repos) => sum + repos.length, 0);
    const categoryCounts: Record<ColumnKey, number> = {
      Active: classifiedRepos.Active.length,
      Stale: classifiedRepos.Stale.length,
      Dormant: classifiedRepos.Dormant.length,
      Archived: classifiedRepos.Archived.length,
    };
    return { totalVisible, categoryCounts };
  }, [classifiedRepos]);

  // Track previous stats to prevent redundant updates
  const prevStatsRef = useRef(stats);

  // Notify parent of stats updates only when stats values actually change
  useEffect(() => {
    if (!onStatsUpdate) return;

    const prev = prevStatsRef.current;
    const hasChanged =
      prev.totalVisible !== stats.totalVisible ||
      prev.categoryCounts.Active !== stats.categoryCounts.Active ||
      prev.categoryCounts.Stale !== stats.categoryCounts.Stale ||
      prev.categoryCounts.Dormant !== stats.categoryCounts.Dormant ||
      prev.categoryCounts.Archived !== stats.categoryCounts.Archived;

    if (hasChanged) {
      onStatsUpdate(stats.totalVisible, stats.categoryCounts);
      prevStatsRef.current = stats;
    }
  }, [stats, onStatsUpdate]);

  // Sync order map with current repos per column
  useEffect(() => {
    setOrderMap((prev) => {
      const nextOrderMap: Record<ColumnKey, string[]> = { Active: [], Stale: [], Dormant: [], Archived: [] };

      (Object.keys(classifiedRepos) as ColumnKey[]).forEach((col) => {
        const ids = classifiedRepos[col].map((r) => r.id);
        const existing = prev[col] || [];
        const ordered = [
          ...existing.filter((id) => ids.includes(id)),
          ...ids.filter((id) => !existing.includes(id)),
        ];
        nextOrderMap[col] = ordered;
      });

      const unchanged = COLUMN_ORDER.every((columnKey) =>
        arraysEqual(prev[columnKey] ?? [], nextOrderMap[columnKey])
      );
      return unchanged ? prev : nextOrderMap;
    });
  }, [classifiedRepos, setOrderMap]);

  // Calculate total counts (excluding hidden repos)
  const totalRepos = repos.length - existingHiddenRepos.length;
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
    setHiddenRepoIds((prev) => (prev.includes(repoId) ? prev : [...prev, repoId]));
  };

  const handleUnhideRepo = (repoId: string) => {
    setHiddenRepoIds((prev) => prev.filter((id) => id !== repoId));
  };

  const handleUnhideAll = () => {
    setHiddenRepoIds([]);
  };

  // Preset handlers
  const handlePresetSelect = (presetId: string) => {
    if (presetId === '') {
      // Clear preset selection
      setCurrentPresetId('');
      return;
    }

    const preset = getPresetById(presetId, user?.userId);
    if (preset) {
      // Load all state from preset
      setSearchQuery(preset.searchQuery);
      setSortOrder(preset.sortOrder);
      setColumnTitles({ ...preset.columnTitles });
      setOrderMap({
        Active: [...preset.columnOrder.Active],
        Stale: [...preset.columnOrder.Stale],
        Dormant: [...preset.columnOrder.Dormant],
        Archived: [...preset.columnOrder.Archived],
      });
      setColumnVisibility({ ...preset.columnVisibility });
      setThresholds({ ...preset.thresholds });
      setColumnAssignments({ ...preset.columnAssignments });
      setHiddenRepoIds([...preset.hiddenRepoIds]);
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
      hiddenRepoIds: [...hiddenRepoIds],
    });

    const newPreset = savePreset(presetSnapshot, user?.userId);
    if (newPreset) {
      setPresets(getPresets(user?.userId));
      setCurrentPresetId(newPreset.id);
      return true;
    }
    return false;
  };

  const handleDeletePreset = (presetId: string) => {
    if (deletePreset(presetId, user?.userId)) {
      setPresets(getPresets(user?.userId));
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
    <div className="h-screen flex flex-col bg-surface-app transition-colors">
      {/* Top Bar */}
      <TopBar
        title={user?.username ? `${user.username} の DevBoard` : 'DevBoard'}
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
        hiddenRepos={existingHiddenRepos}
        onUnhideRepo={handleUnhideRepo}
        onUnhideAll={handleUnhideAll}
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
